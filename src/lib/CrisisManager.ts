import { DepartmentNode, Report } from './structures/DepartmentTree';
import { Stack } from './structures/DataStructures';
import { supabase } from './supabase';

export type ActionType = 'FILE' | 'RESOLVE' | 'ESCALATE' | 'TRANSFER' | 'UNDO' | 'PROMOTE';

export interface SystemAction {
  type: ActionType;
  reportId: string;
  fromDeptId?: number;
  toDeptId?: number;
  oldStatus?: string;
  data?: any;
}

export class CrisisManager {
  root: DepartmentNode;
  undoStack: Stack<SystemAction> = new Stack<SystemAction>();
  simStep: number = 0;
  MAX_ONGOING = 3;

  constructor() {
    this.root = new DepartmentNode(0, "National Crisis Center", "مركز الأزمات الوطني", 0);
  }

  async initialize() {
    let { data: districts } = await supabase.from('districts').select('*').order('id');
    let { data: departments } = await supabase.from('departments').select('*').order('id');

    // AUTO-SEED if DB is empty to prevent UI Breakage
    if (!districts || districts.length === 0) {
      console.log('Seeding districts and departments...');
      await supabase.from('districts').insert([
        { id: 1, name_en: 'District 1', name_ar: 'قسم أول' },
        { id: 2, name_en: 'District 2', name_ar: 'قسم ثان' }
      ]);
      await supabase.from('departments').insert([
        { district_id: 1, name_en: 'Fire Dept', name_ar: 'المطافي' }, { district_id: 1, name_en: 'Police Dept', name_ar: 'قسم الشرطة' }, { district_id: 1, name_en: 'Ambulance', name_ar: 'الإسعاف' }, { district_id: 1, name_en: 'Water Co.', name_ar: 'شركة المياه' }, { district_id: 1, name_en: 'Electricity Co.', name_ar: 'شركة الكهرباء' }, { district_id: 1, name_en: 'Gas Co.', name_ar: 'طوارئ الغاز' },
        { district_id: 2, name_en: 'Fire Dept', name_ar: 'المطافي' }, { district_id: 2, name_en: 'Police Dept', name_ar: 'قسم الشرطة' }, { district_id: 2, name_en: 'Ambulance', name_ar: 'الإسعاف' }, { district_id: 2, name_en: 'Water Co.', name_ar: 'شركة المياه' }, { district_id: 2, name_en: 'Electricity Co.', name_ar: 'شركة الكهرباء' }, { district_id: 2, name_en: 'Gas Co.', name_ar: 'طوارئ الغاز' }
      ]);
      const resDist = await supabase.from('districts').select('*').order('id');
      const resDept = await supabase.from('departments').select('*').order('id');
      districts = resDist.data;
      departments = resDept.data;
    }

    if (!districts || !departments) return;

    districts.forEach(dist => {
      const distNode = new DepartmentNode(dist.id + 1000, dist.name_en, dist.name_ar, dist.id);
      this.root.children.insertLast(distNode);

      departments!.filter(d => d.district_id === dist.id).forEach(dept => {
        const deptNode = new DepartmentNode(dept.id, dept.name_en, dept.name_ar, dist.id, dept.total_units || 10);
        distNode.children.insertLast(deptNode);
      });
    });

    const { data: reports } = await supabase.from('reports').select('*').neq('status', 'resolved');
    const { data: assignments } = await supabase.from('report_assignments').select('*');
    
    if (reports) {
      reports.forEach(r => {
        const assignedDepts = assignments?.filter(a => a.report_id === r.id).map(a => a.department_id) || [r.department_id];
        
        assignedDepts.forEach(deptId => {
          const node = this.root.findNode(deptId);
          if (node) {
            const report: Report = { ...r, timestamp: 0 };
            if (r.status === 'ongoing') {
              node.ongoingReports.insertLast(report);
            } else {
              node.pendingReports.insertSortedByPriority(report, item => item.priority);
            }
          }
        });
      });
    }

    const { count } = await supabase.from('report_actions').select('*', { count: 'exact', head: true });
    this.simStep = count || 0;
  }

  async fileReport(deptIds: number[], data: Partial<Report> & { lat?: number; lng?: number }, userId: string) {
    if (deptIds.length === 0) return;
    const node = this.root.findNode(deptIds[0]);
    if (!node) return;

    this.simStep++;
    const type = this.autoDetectType(node.name_en);
    
    const { data: newReport, error } = await supabase.from('reports').insert({
      department_id: deptIds[0],
      district_id: node.district_id,
      type: type,
      description: data.description,
      priority: data.priority,
      status: 'pending', 
      created_by: userId,
      lat: data.lat,
      lng: data.lng
    }).select().single();

    if (error) throw error;

    await supabase.from('report_assignments').insert({
      report_id: newReport.id,
      department_id: deptIds[0]
    });

    const report: Report = { ...newReport, timestamp: this.simStep };
    
    // Always insert into pending list for new reports
    node.pendingReports.insertSortedByPriority(report, r => r.priority);

    this.undoStack.push({ type: 'FILE', reportId: report.id, toDeptId: deptIds[0] });
    await this.logAction(report.id, 'FILE', userId);
    return report;
  }

  async resolveReport(reportId: string, userId: string) {
    let foundNode: DepartmentNode | null = null;
    let foundReport: Report | null = null;

    const departments = this.getAllDepartmentNodes();
    for (const node of departments) {
      const result = node.findReport(reportId);
      if (result && result.list === 'ongoing') {
        foundNode = node;
        foundReport = result.report;
        break;
      }
    }

    if (!foundNode || !foundReport) return;

    this.simStep++;
    await supabase.from('reports').update({ 
      status: 'resolved', 
      resolved_at: new Date().toISOString() 
    }).eq('id', reportId);

    const allNodes = this.getAllDepartmentNodes();
    allNodes.forEach(node => {
      node.ongoingReports.removeValue(r => r.id === reportId);
    });

    foundReport.status = 'resolved';
    foundNode.resolvedArchive.push(foundReport);

    let promotedId: string | null = null;
    if (!foundNode.pendingReports.isEmpty()) {
      const nextReport = foundNode.pendingReports.toArray()[0];
      foundNode.pendingReports.removeNode(r => r.id === nextReport.id);
      nextReport.status = 'ongoing';
      foundNode.ongoingReports.insertLast(nextReport);
      promotedId = nextReport.id;
      await supabase.from('reports').update({ status: 'ongoing' }).eq('id', nextReport.id);
    }

    this.undoStack.push({ 
      type: 'RESOLVE', 
      reportId: reportId, 
      fromDeptId: foundNode.id,
      data: { promotedId, releasedUnits: foundReport.dispatched_units } 
    });
    
    await this.logAction(reportId, 'RESOLVE', userId);
  }

  async confirmResolution(reportId: string, userId: string) {
    await supabase.from('reports').update({ citizen_confirmed: true }).eq('id', reportId).eq('created_by', userId);
    await this.logAction(reportId, 'CONFIRM', userId);
  }

  async reopenReport(reportId: string, userId: string) {
    await supabase.from('reports').update({ 
      status: 'ongoing', 
      citizen_confirmed: false,
      resolved_at: null 
    }).eq('id', reportId).eq('created_by', userId);
    await this.logAction(reportId, 'REOPEN', userId);
  }

  async assignBackup(reportId: string, deptIds: number[], userId: string) {
    const { data: report } = await supabase.from('reports').select('*').eq('id', reportId).single();
    if (!report) return;

    const allDepartments = this.getAllDepartmentNodes();
    const finalDeptIds = new Set(deptIds);
    
    deptIds.forEach(id => {
      const dNode = this.root.findNode(id);
      if (dNode && (dNode.name_en.includes('Fire') || dNode.name_en.includes('Ambulance'))) {
        const policeInDistrict = allDepartments.find(d => d.district_id === dNode.district_id && d.name_en.includes('Police'));
        if (policeInDistrict) finalDeptIds.add(policeInDistrict.id);
      }
    });

    const assignmentPayload = Array.from(finalDeptIds).map(id => ({
      report_id: reportId,
      department_id: id
    }));

    await supabase.from('report_assignments').upsert(assignmentPayload, { onConflict: 'report_id,department_id' });

    finalDeptIds.forEach(id => {
      const node = this.root.findNode(id);
      if (node) {
        const result = node.findReport(reportId);
        if (!result) {
          const reportObj: Report = { ...report, timestamp: this.simStep };
          if (report.status === 'ongoing') node.ongoingReports.insertLast(reportObj);
          else node.pendingReports.insertSortedByPriority(reportObj, r => r.priority);
        }
      }
    });

    await this.logAction(reportId, 'BACKUP', userId);
  }

  async startResponse(reportId: string, userId: string, unitsCount: number = 1) {
    let foundNode: DepartmentNode | null = null;
    let foundReport: Report | null = null;

    const departments = this.getAllDepartmentNodes();
    for (const node of departments) {
      const result = node.findReport(reportId);
      if (result && result.list === 'pending') {
        foundNode = node;
        foundReport = result.report;
        break;
      }
    }

    if (!foundNode || !foundReport) return;

    // Calculate currently used units
    const usedUnits = foundNode.ongoingReports.toArray().reduce((sum, r) => sum + (r.dispatched_units || 0), 0);
    if (usedUnits + unitsCount > foundNode.total_units) {
      throw new Error(`لا يوجد وحدات كافية حالياً. المتاح: ${foundNode.total_units - usedUnits}`);
    }

    this.simStep++;
    await supabase.from('reports').update({ 
      status: 'ongoing', 
      dispatched_units: unitsCount 
    }).eq('id', reportId);
    
    foundNode.pendingReports.removeNode(r => r.id === reportId);
    foundReport.status = 'ongoing';
    foundReport.dispatched_units = unitsCount;
    foundNode.ongoingReports.insertLast(foundReport);

    this.undoStack.push({ type: 'PROMOTE', reportId: reportId, fromDeptId: foundNode.id });
    await this.logAction(reportId, 'START', userId);
  }

  async escalateReport(reportId: string, userId: string, helpUnits: number = 1) {
    this.simStep++;
    const departments = this.getAllDepartmentNodes();
    let sourceNode: DepartmentNode | null = null;
    let report: Report | null = null;

    for (const node of departments) {
      const res = node.findReport(reportId);
      if (res && res.list === 'pending') {
        sourceNode = node;
        report = res.report;
        break;
      }
    }

    if (!sourceNode || !report) return;

    // Escalate to the sibling district (manual request for help)
    const siblingDistrictId = sourceNode.district_id === 1 ? 2 : 1;
    const siblingDept = departments.find(d => d.name_en === sourceNode!.name_en && d.district_id === siblingDistrictId);
    
    if (siblingDept) {
      sourceNode.pendingReports.removeNode(r => r.id === reportId);
      report.district_id = siblingDistrictId;
      report.department_id = siblingDept.id;
      report.status = 'pending';
      report.dispatched_units = 0;
      
      siblingDept.pendingReports.insertSortedByPriority(report, r => r.priority);

      await supabase.from('reports').update({ 
        district_id: siblingDistrictId, 
        department_id: siblingDept.id,
        status: 'pending',
        escalated: true,
        description: report.description + ` (طلب مساعدة خارجية: مطلوب ${helpUnits} وحدات من القسم السابق)`
      }).eq('id', reportId);

      await this.logAction(reportId, 'ESCALATE', userId);
    }
  }

  async escalateAll(userId: string) {
    this.simStep++;
    const departments = this.getAllDepartmentNodes();
    let escalatedCount = 0;

    for (const node of departments) {
      const pending = node.pendingReports.toArray();
      for (const report of pending) {
        if ((this.simStep - report.timestamp) > 3) {
          const siblingDistrictId = node.district_id === 1 ? 2 : 1;
          const siblingDept = departments.find(d => d.name_en === node.name_en && d.district_id === siblingDistrictId);
          
          if (siblingDept) {
            node.pendingReports.removeNode(r => r.id === report.id);
            report.district_id = siblingDistrictId;
            report.department_id = siblingDept.id;
            report.status = siblingDept.ongoingReports.size() < this.MAX_ONGOING ? 'ongoing' : 'pending';
            
            if (report.status === 'ongoing') siblingDept.ongoingReports.insertLast(report);
            else siblingDept.pendingReports.insertSortedByPriority(report, r => r.priority);

            await supabase.from('reports').update({ 
              district_id: siblingDistrictId, 
              department_id: siblingDept.id,
              status: report.status,
              escalated: true
            }).eq('id', report.id);

            escalatedCount++;
          }
        }
      }
    }

    if (escalatedCount > 0) {
       this.undoStack.push({ type: 'ESCALATE', reportId: 'GLOBAL', data: { count: escalatedCount } });
    }
  }

  async transferPending(reportId: string, targetDeptId: number, userId: string) {
    this.simStep++;
    const departments = this.getAllDepartmentNodes();
    let sourceNode: DepartmentNode | null = null;
    let report: Report | null = null;

    for (const node of departments) {
      const res = node.findReport(reportId);
      if (res && res.list === 'pending') {
        sourceNode = node;
        report = res.report;
        break;
      }
    }

    const targetNode = this.root.findNode(targetDeptId);
    if (!sourceNode || !targetNode || !report) return;

    sourceNode.pendingReports.removeNode(r => r.id === reportId);
    report.department_id = targetDeptId;
    report.status = targetNode.ongoingReports.size() < this.MAX_ONGOING ? 'ongoing' : 'pending';

    if (report.status === 'ongoing') targetNode.ongoingReports.insertLast(report);
    else targetNode.pendingReports.insertSortedByPriority(report, r => r.priority);

    await supabase.from('reports').update({ 
      department_id: targetDeptId,
      status: report.status 
    }).eq('id', reportId);

    this.undoStack.push({ 
      type: 'TRANSFER', 
      reportId: reportId, 
      fromDeptId: sourceNode.id, 
      toDeptId: targetDeptId 
    });
    
    await this.logAction(reportId, 'TRANSFER', userId);
  }

  async undo(userId: string) {
    const action = this.undoStack.pop();
    if (!action) return;
  }

  private autoDetectType(deptName: string): string {
    if (deptName.includes('Fire')) return 'Fire';
    if (deptName.includes('Police')) return 'Theft';
    if (deptName.includes('Ambulance')) return 'Accident';
    if (deptName.includes('Water')) return 'Water Leak';
    if (deptName.includes('Electricity')) return 'Power Outage';
    if (deptName.includes('Gas')) return 'Gas Leak';
    return 'Other';
  }

  private getAllDepartmentNodes(): DepartmentNode[] {
    const nodes: DepartmentNode[] = [];
    const districts = this.root.children.toArray();
    districts.forEach(dist => {
      nodes.push(...dist.children.toArray());
    });
    return nodes;
  }

  private async logAction(reportId: string, action: string, userId: string) {
    await supabase.from('report_actions').insert({
      report_id: reportId,
      action: action,
      performed_by: userId
    });
  }
}
