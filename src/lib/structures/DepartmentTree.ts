import { SinglyLinkedList, DoublyLinkedList, CircularLinkedList } from './DataStructures';

export interface Report {
  id: string;
  type: string;
  description: string;
  priority: number;
  status: 'pending' | 'ongoing' | 'resolved' | 'escalated';
  created_at: string;
  department_id: number;
  district_id: number;
  timestamp: number; // simStep when filed
  citizen_confirmed?: boolean;
}

export class DepartmentNode {
  id: number;
  name_en: string;
  name_ar: string;
  district_id: number;
  children: SinglyLinkedList<DepartmentNode> = new SinglyLinkedList<DepartmentNode>();
  
  ongoingReports: SinglyLinkedList<Report> = new SinglyLinkedList<Report>();
  pendingReports: DoublyLinkedList<Report> = new DoublyLinkedList<Report>();
  resolvedArchive: CircularLinkedList<Report> = new CircularLinkedList<Report>(10);

  constructor(id: number, name_en: string, name_ar: string, district_id: number) {
    this.id = id;
    this.name_en = name_en;
    this.name_ar = name_ar;
    this.district_id = district_id;
  }

  // DFS search for a department node by ID
  findNode(id: number): DepartmentNode | null {
    if (this.id === id) return this;
    let currentChild = this.children.getHead();
    while (currentChild) {
      const found = currentChild.value.findNode(id);
      if (found) return found;
      currentChild = currentChild.next;
    }
    return null;
  }

  // Find a report by ID in this node (ongoing/pending)
  findReport(reportId: string): { report: Report, list: 'ongoing' | 'pending' | 'resolved' } | null {
    const ongoing = this.ongoingReports.toArray().find(r => r.id === reportId);
    if (ongoing) return { report: ongoing, list: 'ongoing' };
    
    const pending = this.pendingReports.toArray().find(r => r.id === reportId);
    if (pending) return { report: pending, list: 'pending' };

    const resolved = this.resolvedArchive.toArray().find(r => r.id === reportId);
    if (resolved) return { report: resolved, list: 'resolved' };

    return null;
  }
}
