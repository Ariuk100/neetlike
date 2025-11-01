"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/app/context/AuthContext";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, User, Lock } from "lucide-react";

type AimagSoum = { aimag: string; soums: string[] };

export default function ProfilePage() {
  const { user, firebaseUser } = useAuth();

  const [locations, setLocations] = useState<AimagSoum[]>([]);
  const [profileData, setProfileData] = useState({
    lastName: "",
    name: "",
    school: "",
    grade: "",
    province: "",
    district: "",
    phone: "",
    teacherId: "", // сервер whitelist-д байхгүй тул илгээхгүй
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  // Google эсэх
  const isGoogleProvider = useMemo(
    () => firebaseUser?.providerData?.some((p) => p?.providerId === "google.com") ?? false,
    [firebaseUser]
  );

  // name/lastName editable эсэхийн дүрэм
  const nameFieldsEditable = useMemo(() => {
    const hasLastName = Boolean(user?.lastName && user.lastName.trim());
    const hasName = Boolean(user?.name && user.name.trim());
    if (isGoogleProvider) {
      // Google: хоосон бол зөвшөөрнө, аль хэдийн байвал түгжинэ
      return !hasLastName || !hasName;
    }
    // Non-Google: бүрэн байвал түгжинэ, дутуу бол зөвшөөрнө
    return !hasLastName || !hasName;
  }, [isGoogleProvider, user?.lastName, user?.name]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/mn_aimag_soum_min.json");
        if (!res.ok) throw new Error("Failed to load locations");
        const data = (await res.json()) as AimagSoum[];
        setLocations(data);
      } catch {
        toast.error("Аймаг/Сумын жагсаалтыг ачаалж чадсангүй.");
      }
    })();
  }, []);

  // populate state
  useEffect(() => {
    if (user) {
      setProfileData((prev) => ({
        ...prev,
        lastName: user.lastName || "",
        name: user.name || "",
        school: user.school || "",
        grade: user.grade || "",
        province: user.province || "",
        district: user.district || "",
        phone: user.phone || "",
        teacherId: (user as { teacherId?: string }).teacherId || "",
      }));
    }
  }, [user]);

  const selectedSoums = useMemo(
    () => locations.find((loc) => loc.aimag === profileData.province)?.soums ?? [],
    [locations, profileData.province]
  );

  const handleProfileChange = (field: keyof typeof profileData, value: string) => {
    if (field === "province") {
      setProfileData((prev) => ({ ...prev, province: value, district: "" }));
      return;
    }
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field: keyof typeof passwordData, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user?.uid) return;

    // phone basic validation
    const phoneDigits = profileData.phone.replace(/\D/g, "");
    if (profileData.phone && !/^\d{8}$/.test(phoneDigits)) {
      toast.error("Утасны дугаар буруу байна", { description: "8 оронтой тоо оруулна уу." });
      return;
    }

    // name/lastName validation (editable үед л)
    if (nameFieldsEditable) {
      if (!profileData.lastName.trim() || !profileData.name.trim()) {
        toast.error("Овог/Нэр дутуу байна", { description: "Овог болон Нэр талбарыг бөглөнө үү." });
        return;
      }
    }

    // сервер рүү зөвшөөрөгдсөн талбаруудыг л илгээнэ
    const payload: { profileData: Record<string, string> } = { profileData: {} };
    // үргэлж илгээж болох талбарууд
    if (profileData.school) payload.profileData.school = profileData.school;
    if (profileData.grade) payload.profileData.grade = profileData.grade;
    if (profileData.province) payload.profileData.province = profileData.province;
    if (profileData.district) payload.profileData.district = profileData.district;
    if (profileData.phone) payload.profileData.phone = profileData.phone;

    // name/lastName зөвхөн editable үед илгээнэ
    if (nameFieldsEditable) {
      payload.profileData.lastName = profileData.lastName.trim();
      payload.profileData.name = profileData.name.trim();
    }

    setLoadingSave(true);
    try {
      const res = await fetch("/api/register-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error("Мэдээллийг хадгалж чадсангүй.", { description: data?.error || "Internal server error" });
      } else {
        toast.success("Мэдээлэл амжилттай хадгалагдлаа");
      }
    } catch {
      toast.error("Алдаа гарлаа", { description: "Мэдээллийг хадгалж чадсангүй." });
    } finally {
      setLoadingSave(false);
    }
  };

  const handleChangePassword = async () => {
    const isGoogle =
      firebaseUser?.providerData?.some((p) => p?.providerId === "google.com") ?? false;
    if (isGoogle) {
      toast.error("Энэ бүртгэлд нууц үг холбогдоогүй байна.", {
        description: "Google бүртгэлээр нэвтэрдэг тул нууц үг солих шаардлагагүй.",
      });
      return;
    }

    if (!firebaseUser?.email) {
      toast.error("Нэвтрэлт баталгаажсангүй.");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Шинэ нууц үг таарахгүй байна.");
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("Нууц үг хэт богино байна", { description: "Дор хаяж 6 тэмдэгт байх ёстой." });
      return;
    }

    setLoadingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(
        firebaseUser.email,
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, passwordData.newPassword);
      toast.success("Нууц үг амжилттай солигдлоо.");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      toast.error("Нууц үг солиход алдаа гарлаа", {
        description: "Одоогийн нууц үгээ зөв оруулсан эсэхээ шалгана уу.",
      });
    } finally {
      setLoadingPassword(false);
    }
  };

  const photoURL = firebaseUser?.photoURL || user?.photoURL || "/assets/images/users/avatar-1.jpg";

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Хувийн мэдээлэл</h1>
        <p className="text-muted-foreground">Хувийн мэдээлэл болон тохиргоогоо эндээс удирдна уу.</p>
      </div>

      <Separator className="mb-8" />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Left card */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="items-center text-center">
              <Image src={photoURL} alt="Avatar" width={96} height={96} className="rounded-full mb-4 border" />
              <CardTitle>{user?.name || "Хэрэглэгч"}</CardTitle>
              <CardDescription>{user?.email}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              {user?.province && <p>📍 {user.province}{user?.district ? `, ${user.district}` : ""}</p>}
              {user?.school && <p>🏫 {user.school}</p>}
              {user?.grade && <p>📚 {user.grade}</p>}
              {user?.phone && <p>📞 {user.phone}</p>}
            </CardContent>
          </Card>
        </div>

        {/* Right forms */}
        <div className="md:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User size={20} /> Хувийн мэдээлэл</CardTitle>
              <CardDescription>Эндээс та өөрийн хувийн мэдээллээ шинэчлэх боломжтой.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Овог</Label>
                  <Input
                    value={profileData.lastName}
                    onChange={(e) => handleProfileChange("lastName", e.target.value)}
                    disabled={!nameFieldsEditable}
                    placeholder={nameFieldsEditable ? "Овог оруулах" : undefined}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Нэр</Label>
                  <Input
                    value={profileData.name}
                    onChange={(e) => handleProfileChange("name", e.target.value)}
                    disabled={!nameFieldsEditable}
                    placeholder={nameFieldsEditable ? "Нэр оруулах" : undefined}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Сургууль</Label>
                  <Input value={profileData.school} onChange={(e) => handleProfileChange("school", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Анги</Label>
                  <Input value={profileData.grade} onChange={(e) => handleProfileChange("grade", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Аймаг</Label>
                  <Select value={profileData.province} onValueChange={(v) => handleProfileChange("province", v)}>
                    <SelectTrigger><SelectValue placeholder="Сонгох" /></SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => <SelectItem key={loc.aimag} value={loc.aimag}>{loc.aimag}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
  <Label>Сум / Дүүрэг</Label>
  <Select
    value={profileData.district}
    onValueChange={(v) => handleProfileChange("district", v)}
    disabled={!profileData.province}
  >
    <SelectTrigger><SelectValue placeholder="Сонгох" /></SelectTrigger>
    <SelectContent>
      {/* Давхардлыг арилгах ба өвөрмөц key ашиглах */}
      {Array.from(new Set(selectedSoums)).map((s) => (
        <SelectItem key={`${profileData.province}:${s}`} value={s}>
          {s}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
                <div className="space-y-2">
                  <Label>Утас</Label>
                  <Input type="tel" value={profileData.phone} onChange={(e) => handleProfileChange("phone", e.target.value)} />
                </div>
              </div>
              <Button onClick={handleSave} disabled={loadingSave}>
                {loadingSave && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Хадгалах
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Lock size={20} /> Нууц үг солих</CardTitle>
              <CardDescription>Нууц үгээ солихын тулд доорх талбаруудыг бөглөнө үү.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Одоогийн нууц үг</Label>
                <Input id="currentPassword" type="password" value={passwordData.currentPassword} onChange={(e) => handlePasswordChange("currentPassword", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Шинэ нууц үг</Label>
                <Input id="newPassword" type="password" value={passwordData.newPassword} onChange={(e) => handlePasswordChange("newPassword", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Нууц үг давтах</Label>
                <Input id="confirmPassword" type="password" value={passwordData.confirmPassword} onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)} />
              </div>
              <Button onClick={handleChangePassword} disabled={loadingPassword}>
                {loadingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Нууц үг солих
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}