import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listUsers, updateUser, type ManagedUser } from "@/lib/users.functions";
import { getMyProfile } from "@/lib/profile.functions";

export const Route = createFileRoute("/_authenticated/manage-user")({
  head: () => ({
    meta: [
      { title: "Kelola User | Admin Khatam" },
      { name: "description", content: "Kelola data user dan akses admin (khusus admin)." },
      { property: "og:title", content: "Kelola User | Admin Khatam" },
      { property: "og:description", content: "Kelola data user dan akses admin (khusus admin)." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ManageUserPage,
});

function ManageUserPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchProfile = useServerFn(getMyProfile);
  const fetchUsers = useServerFn(listUsers);
  const saveUser = useServerFn(updateUser);
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["my-profile"],
    queryFn: () => fetchProfile(),
  });
  const isAdmin = !!profile?.is_admin;
  useEffect(() => {
    if (!profileLoading && !isAdmin) navigate({ to: "/dashboard", replace: true });
  }, [profileLoading, isAdmin, navigate]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["manage-users"],
    queryFn: () => fetchUsers(),
    enabled: isAdmin,
  });

  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(
      (u) => u.nama.toLowerCase().includes(q) || u.nik.includes(q) || (u.divisi ?? "").toLowerCase().includes(q),
    );
  }, [users, search]);

  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState({ nama: "", email: "", phone: "", lokasiKerja: "", divisi: "", isAdmin: false });
  const openEdit = (u: ManagedUser) => {
    setEditing(u);
    setForm({
      nama: u.nama,
      email: u.email ?? "",
      phone: u.phone ?? "",
      lokasiKerja: u.lokasi_kerja ?? "",
      divisi: u.divisi ?? "",
      isAdmin: u.is_admin,
    });
  };

  const mutation = useMutation({
    mutationFn: () => saveUser({ data: { id: editing!.id, ...form } }),
    onSuccess: () => {
      toast.success("Data user disimpan");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["manage-users"] });
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (profileLoading || !isAdmin) {
    return <div className="p-10 text-center text-muted-foreground">Memuat...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-bold text-foreground">Kelola User</h1>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard">Kembali</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <CardTitle>Semua User ({users.length})</CardTitle>
            <Input
              placeholder="Cari nama, NIK, divisi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {isLoading ? (
              <p className="text-muted-foreground">Memuat...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>NIK</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>No. HP</TableHead>
                    <TableHead>Divisi</TableHead>
                    <TableHead>Lokasi Kerja</TableHead>
                    <TableHead>Akses</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.nama}</TableCell>
                      <TableCell>{u.nik}</TableCell>
                      <TableCell>{u.email || "-"}</TableCell>
                      <TableCell>{u.phone || "-"}</TableCell>
                      <TableCell>{u.divisi || "-"}</TableCell>
                      <TableCell>{u.lokasi_kerja || "-"}</TableCell>
                      <TableCell>
                        {u.is_admin ? <Badge>Admin</Badge> : <Badge variant="secondary">User</Badge>}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User — NIK {editing?.nik}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {(
              [
                ["nama", "Nama"],
                ["email", "Email"],
                ["phone", "No. HP / WhatsApp"],
                ["divisi", "Divisi"],
                ["lokasiKerja", "Lokasi Kerja"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={`f-${key}`}>{label}</Label>
                <Input
                  id={`f-${key}`}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-medium">Akses Admin</p>
                <p className="text-xs text-muted-foreground">Bisa membuka menu Laporan dan Kelola User</p>
              </div>
              <Switch
                checked={form.isAdmin}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isAdmin: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Batal
            </Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
