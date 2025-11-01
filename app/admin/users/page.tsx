'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/app/context/AuthContext';
import { toast } from 'sonner';
import { useCacheContext } from '@/lib/CacheContext';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getFilteredRowModel,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { MoreHorizontal, ArrowUpDown, Users, GraduationCap, UserCheck, FileDown } from "lucide-react";

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';

type Role = 'student' | 'teacher' | 'moderator' | 'admin';
interface UserData {
  id: string; uid: string; email: string; name?: string; lastName?: string;
  phone?: string; school?: string; grade?: string; role: Role; createdAt?: string;
}
const toISODateString = (input: unknown): string | undefined => {
  if (input && typeof input === 'object' && 'toDate' in input) {
    return ((input as { toDate: () => Date }).toDate()).toISOString().slice(0, 10);
  }
  return undefined;
};
const asString = (v: unknown): string => (typeof v === 'string' ? v : '');
const asRole = (v: unknown): Role => (['student', 'teacher', 'moderator', 'admin'].includes(v as string) ? v as Role : 'student');

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const cache = useCacheContext();
  
  const [data, setData] = useState<UserData[]>([]);
  const [fetching, setFetching] = useState(true);
  const [deletingUid, setDeletingUid] = useState<string>('');
  const [deletingLoading, setDeletingLoading] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/unauthorized');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || user.role !== 'admin' || !cache) return;
    
    let unsub: (() => void) | undefined;

    const loadUsers = async () => {
      const cachedData = await cache.get<UserData[]>('admin_users_data', { storage: 'indexedDB' });
      const cachedVersion = await cache.get<number>('admin_users_version', { storage: 'indexedDB' });
      if (cachedData) {
        setData(cachedData);
        setFetching(false);
      }

      const versionRes = await fetch('/api/admin/users-version'); // same-origin → cookies included
      if (!versionRes.ok) {
        toast.error("Серверийн хувилбар шалгахад алдаа гарлаа.");
        setFetching(false);
        return;
      }
      const { version: latestVersion } = await versionRes.json() as { version: number | null };
      
      if (latestVersion !== null && latestVersion === cachedVersion) {
        setFetching(false);
        return;
      }
      
      unsub = onSnapshot(collection(db, 'users'), async (snap) => {
        const list: UserData[] = snap.docs.map((d) => ({
          id: d.id, uid: d.id, email: asString(d.data().email), name: asString(d.data().name),
          lastName: asString(d.data().lastName), phone: asString(d.data().phone), school: asString(d.data().school),
          grade: asString(d.data().grade), role: asRole(d.data().role), createdAt: toISODateString(d.data().createdAt),
        }));
        setData(list);
        setFetching(false);

        await cache.set('admin_users_data', list, { storage: 'indexedDB' });
        await cache.set('admin_users_version', latestVersion, { storage: 'indexedDB' });
      }, (err) => {
        console.error('onSnapshot(users) error:', err);
        toast.error("Хэрэглэгчийн мэдээлэл татахад алдаа гарлаа.");
        setFetching(false);
      });
    };

    loadUsers();

    return () => {
      if (unsub) unsub();
    };
  }, [user, cache, authLoading]);

  const handleRoleChange = async (uid: string, newRole: Role) => {
    const originalUser = data.find(u => u.uid === uid);
    if (!originalUser) return;

    // ✅ UI-level guard: өөрийгөө non-admin болгохыг хориглоно (сервер ч хориглодог)
    if (user?.uid === uid && newRole !== 'admin') {
      toast.error("Өөрийн эрхийг admin-аас бууруулах боломжгүй.");
      return;
    }

    // ✅ Optimistic UI, зөвхөн API дуудна (Firestore-г сервер mirror-дана)
    setData(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
    try {
      const resp = await fetch('/api/admin/set-user-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ uid, role: newRole }),
      });
      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(errJson.error || 'Custom claim update failed');
      }
      toast.success(`"${originalUser.name || originalUser.email}"-н эрхийг сольлоо.`);
      await cache.remove('admin_users_version', { storage: 'indexedDB' });
    } catch (e) {
      setData(prev => prev.map(u => u.uid === uid ? originalUser : u));
      toast.error("Эрх солиход алдаа гарлаа", { description: (e as Error).message });
    }
  };

  const handleDelete = async () => {
    if (!deletingUid) return;

    // ✅ UI-level guard: өөрийгөө устгах оролдлогыг хориглоно (сервер ч хориглодог)
    if (user?.uid === deletingUid) {
      toast.error("Өөрийгөө устгах боломжгүй.");
      return;
    }

    setDeletingLoading(true);
    try {
      const resp = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ uid: deletingUid }),
      });
      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(errJson.error || 'User deletion failed');
      }
      toast.success("Хэрэглэгчийг амжилттай устгалаа.");
      await cache.remove('admin_users_version', { storage: 'indexedDB' });

      // Оптимистик байдлаар жагсаалтаас түр зуур авч болно (snapshot бас шинэчилнэ)
      setData(prev => prev.filter(u => u.uid !== deletingUid));
    } catch (e) {
      toast.error("Устгахад алдаа гарлаа", { description: (e as Error).message });
    } finally {
      setDeletingLoading(false);
      setDeletingUid('');
      setIsDeleteDialogOpen(false);
    }
  };
  
  const columns: ColumnDef<UserData>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    { accessorKey: "name", header: ({ column }) => (<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Нэр <ArrowUpDown className="ml-2 h-4 w-4" /></Button>) },
    { accessorKey: "lastName", header: ({ column }) => (<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Овог <ArrowUpDown className="ml-2 h-4 w-4" /></Button>) },
    { accessorKey: "email", header: ({ column }) => (<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Имэйл <ArrowUpDown className="ml-2 h-4 w-4" /></Button>) },
    {
      accessorKey: "role",
      header: "Эрх",
      cell: ({ row }) => {
        const u = row.original;
        return (
          <Select value={u.role} onValueChange={(r: Role) => handleRoleChange(u.uid, r)}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        );
      }
    },
    { accessorKey: "phone", header: ({ column }) => (<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Утас <ArrowUpDown className="ml-2 h-4 w-4" /></Button>) },
    { accessorKey: "school", header: ({ column }) => (<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Сургууль <ArrowUpDown className="ml-2 h-4 w-4" /></Button>) },
    { accessorKey: "createdAt", header: ({ column }) => (<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>Бүртгүүлсэн <ArrowUpDown className="ml-2 h-4 w-4" /></Button>) },
    {
      id: "actions",
      cell: ({ row }) => {
        const u = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Цэс нээх</span><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Үйлдлүүд</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(u.uid)}>UID хуулах</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(`/admin/profile/${u.uid}`)}>Профайл засах</DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => { setDeletingUid(u.uid); setIsDeleteDialogOpen(true); }}
              >
                Устгах
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data, columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, columnFilters, rowSelection, globalFilter },
  });

  const stats = useMemo(() => ({
    total: data.length,
    students: data.filter(u => u.role === 'student').length,
    teachers: data.filter(u => u.role === 'teacher').length,
    admins: data.filter(u => u.role === 'admin' || u.role === 'moderator').length, // UI-д "Админууд" гэж харуулж байгаа тул moderator-уудыг хамруулж байна
  }), [data]);

  if (authLoading || (fetching && !data.length)) {
    return <div className="p-6">Уншиж байна...</div>;
  }
  
  return (
    <main className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-4">Хэрэглэгчийн Удирдлага</h1>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Нийт хэрэглэгч</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Сурагчид</CardTitle><GraduationCap className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.students}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Багш нар</CardTitle><UserCheck className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.teachers}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Админууд</CardTitle><UserCheck className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.admins}</div></CardContent></Card>
          </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Хэрэглэгчдийн жагсаалт</CardTitle>
            <CardDescription>Эндээс та хэрэглэгчдийн мэдээллийг харж, удирдах боломжтой.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-4">
              <Input placeholder="Бүх мэдээллээс хайх..."
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className="max-w-sm"
              />
              <Button variant="outline"><FileDown className="mr-2 h-4 w-4" /> Export</Button>
            </div>
            <div className="relative w-full overflow-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                        {row.getVisibleCells().map((cell) => (<TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">Хэрэглэгч олдсонгүй.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
              <div className="flex-1 text-sm text-muted-foreground">
                {table.getFilteredSelectedRowModel().rows.length} / {table.getFilteredRowModel().rows.length} мөр сонгогдсон.
              </div>
              <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Өмнөх</Button>
              <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Дараах</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Та итгэлтэй байна уу?</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ үйлдлийг буцаах боломжгүй. Энэ нь хэрэглэгчийн бүртгэлийг манай системээс бүрмөсөн устгах болно.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingLoading}>Болих</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={!deletingUid || deletingLoading}>
              {deletingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Устгах"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}