# National Crisis Management System

A production-grade, multi-portal emergency response platform built with **Next.js 15**, **TypeScript**, **Tailwind CSS**, and **Supabase**.

## 🚀 Setup Instructions

1.  **Clone the repository** (or use the provided files).
2.  **Install dependencies**:
    ```bash
    npm install --legacy-peer-deps
    ```
3.  **Configure Environment Variables**:
    Create a `.env.local` file in the root directory and add the following:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
    SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
    ```
4.  **Database Setup**:
    - Log in to your Supabase Dashboard.
    - Go to the **SQL Editor**.
    - Copy the contents of `supabase-migration.sql` and run them to set up tables, RLS policies, and seed data.
5.  **Run Locally**:
    ```bash
    npm run dev
    ```
    Access the app at [http://localhost:3000](http://localhost:3000).

## 🛡️ Portals

### Citizen Portal (`/citizen`)
- **Signup**: Requires phone number (mapped to `phone@citizen.eg`) and National ID image upload.
- **Dashboard**: Submit reports with district/department selection and priority control.
- **My Reports**: Track status (Pending, Ongoing, Resolved, Escalated).

### Employee Portal (`/employee`)
- **Login**: Use Employee ID (mapped to `emp<ID>@gov.eg`).
- **Dashboard**: Coordinate crisis response using custom in-memory data structures (Linked Lists, Trees).
- **Actions**:
    - **Resolve**: Moves report to circular archive, promotes next pending.
    - **Global Escalation**: Moves overdue reports (simStep diff > 3) to sibling districts.
    - **Transfer**: Forced transfer between departments.
    - **Undo**: Reverses the last coordination action.

### Admin Panel (`/employee/admin`)
- Accessible to users with the `admin` role.
- Register new government employee accounts.

## 🧠 Custom Data Structures (In-Memory)
The system uses custom implementation of:
- `SinglyLinkedList`: Foundation for Queue/Stack.
- `DoublyLinkedList`: Priority-sorted pending queue.
- `CircularLinkedList`: Fixed-capacity resolved archive (10).
- `General Tree`: Hierarchical department organization.

## 🛠️ Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Database/Auth**: Supabase
- **Styling**: Tailwind CSS
- **State**: React State + Custom Structures
- **Icons**: Lucide React
