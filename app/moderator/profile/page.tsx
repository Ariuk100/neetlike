"use client";

import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  Row,
  Tabs,
  ConfigProvider,
  theme,
  Select,
  message,
} from "antd";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/app/context/AuthContext";

const { TabPane } = Tabs;

export default function ProfilePage() {
  const { user, firebaseUser, loading } = useAuth();
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const [isDark, setIsDark] = useState(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(html.classList.contains("dark"));
    });
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const [locations, setLocations] = useState<{ aimag: string; soums: string[] }[]>([]);
  const [selectedAimag, setSelectedAimag] = useState<string>("");
  const [soums, setSoums] = useState<string[]>([]);

  useEffect(() => {
    fetch("/mn_aimag_soum_min.json")
      .then((res) => res.json())
      .then((data) => setLocations(data));
  }, []);

  useEffect(() => {
    const found = locations.find((item) => item.aimag === selectedAimag);
    setSoums(found ? found.soums : []);
    form.setFieldsValue({ district: undefined });
  }, [selectedAimag, locations, form]);

  useEffect(() => {
    if (!loading && !user) {
      const cached = localStorage.getItem("authUser");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          form.setFieldsValue(parsed);
          setSelectedAimag(parsed.province || "");
        } catch {}
      }
    }
  }, [loading, user, form]);

  useEffect(() => {
    if (user) {
      form.setFieldsValue(user);
      setSelectedAimag(user.province || "");
      localStorage.setItem("authUser", JSON.stringify(user));
    }
  }, [user, form]);

  const errorMessages: Record<string, string> = {
    "auth/wrong-password": "Одоогийн нууц үг буруу байна.",
    "auth/weak-password": "Шинэ нууц үг хэт сул байна.",
    "auth/user-not-found": "Хэрэглэгч олдсонгүй.",
    "auth/invalid-email": "Имэйл хаяг буруу байна.",
    "auth/too-many-requests": "Их оролдлого хийсэн байна, түр хүлээгээд дахин оролдоно уу.",
    "default": "Алдаа гарлаа, дахин оролдоно уу."
  };

  const handleSave = async () => {
    try {
      const values = form.getFieldsValue();
      if (!user?.uid) return;
      await updateDoc(doc(db, "users", user.uid), values);
      message.success("Мэдээлэл амжилттай хадгалагдлаа");
      const updatedUser = { ...user, ...values };
      localStorage.setItem("authUser", JSON.stringify(updatedUser));
    } catch (err: any) {
      console.error(err);
      const code = err.code || "default";
      message.error(errorMessages[code] || errorMessages["default"]);
    }
  };

  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm.getFieldsValue();
    if (!firebaseUser) {
      message.error("Нэвтэрсэн хэрэглэгч олдсонгүй.");
      return;
    }
    if (newPassword !== confirmPassword) {
      message.error("Шинэ нууц үг таарахгүй байна.");
      return;
    }
    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email!, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPassword);
      message.success("Нууц үг амжилттай солигдлоо.");
      passwordForm.resetFields();
    } catch (err: any) {
  console.error(err);
  const code = err.code || "default";
  message.error(errorMessages[code] || errorMessages["default"]);
}
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: "#1677ff",
          borderRadius: 8,
        },
      }}
    >
      <div
        style={{
          background: isDark ? "#141414" : "#f5f6fa",
          minHeight: "100vh",
          padding: "20px 120px",
          color: isDark ? "#fff" : "#000",
        }}
      >
        <div
          style={{
            background: isDark
              ? "linear-gradient(90deg, rgba(0,102,204,1) 0%, rgba(102,51,153,1) 100%)"
              : "linear-gradient(90deg, rgba(255,189,90,1) 0%, rgba(183,154,255,1) 100%)",
            height: 120,
            borderRadius: 8,
            position: "relative",
            marginBottom: 60,
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: -50,
              left: 0,
              width: "100%",        // 👈 нэмсэн
              display: "flex",      // 👈 илүү найдвартай
              flexDirection: "column",
              alignItems: "center", // 👈 бүгдийг голлуулна
            }}
          >
          <img
  src={
    (firebaseUser?.photoURL && firebaseUser.photoURL.trim() !== "" 
      ? firebaseUser.photoURL 
      : (user?.photoURL && user.photoURL.trim() !== "" 
          ? user.photoURL 
          : "/assets/images/users/avatar-1.jpg"))
  }
  alt="avatar"
  style={{
    width: 100,
    height: 100,
    borderRadius: "50%",
    border: "4px solid white",
    objectFit: "cover",
  }}
/>
            <h3 style={{ margin: "10px 0 0" }}>{user?.name || "Хэрэглэгч"}</h3>
            <p style={{ color: isDark ? "#ccc" : "#555" }}>{user?.email}</p>
          </div>
        </div>

        <Tabs defaultActiveKey="4" centered style={{ marginBottom: 20 }}>
          <TabPane tab="Тохиргоо" key="4" />
        </Tabs>

        <Row gutter={[32, 16]}>
          <Col xs={24} md={12} lg={8}>
            <Card title="Хувийн мэдээлэл">
              <Form layout="vertical" form={form}>
                <Form.Item label="Овог" name="lastName">
                  <Input  disabled/>
                </Form.Item>
                <Form.Item label="Нэр" name="name">
                  <Input disabled />
                </Form.Item>
                <Form.Item label="Email" name="email">
                  <Input disabled />
                </Form.Item>
                <Form.Item label="Сургууль" name="school">
                  <Input />
                </Form.Item>
                <Form.Item label="Анги" name="grade">
                  <Input />
                </Form.Item>
                <Form.Item label="Аймаг" name="province">
                  <Select
                    value={selectedAimag}
                    onChange={(value) => setSelectedAimag(value)}
                    options={locations.map((item) => ({
                      label: item.aimag,
                      value: item.aimag,
                    }))}
                    placeholder="Аймгаа сонгоно уу"
                  />
                </Form.Item>
                <Form.Item label="Сум / Дүүрэг" name="district">
                  <Select
                    options={soums.map((soum) => ({
                      label: soum,
                      value: soum,
                    }))}
                    placeholder="Сум / Дүүргээ сонгоно уу"
                  />
                </Form.Item>
                <Form.Item label="Утас" name="phone">
                  <Input />
                </Form.Item>
                <Form.Item label="Багш ID" name="teacherId">
                  <Input />
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    className="light-blue-btn"
                    style={{ marginRight: 10 }}
                    onClick={handleSave}
                  >
                    Хадгалах
                  </Button>
                  <Button danger>Цуцлах</Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          <Col xs={24} md={12} lg={8}>
            <Card title="Нууц үг солих" style={{ marginBottom: 20 }}>
              <Form layout="vertical" form={passwordForm}>
                <Form.Item label="Одоогийн нууц үг" name="currentPassword">
                  <Input.Password placeholder="Current Password" />
                </Form.Item>
                <Form.Item label="Шинэ нууц үг" name="newPassword">
                  <Input.Password placeholder="New Password" />
                </Form.Item>
                <Form.Item label="Нууц үг давтах" name="confirmPassword">
                  <Input.Password placeholder="Confirm Password" />
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    style={{ marginRight: 10 }}
                    className="light-blue-btn"
                    onClick={handleChangePassword}
                  >
                    Нууц үг солих
                  </Button>
                  <Button danger onClick={() => passwordForm.resetFields()}>
                    Цуцлах
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            <Card title="Бусад тохиргоо">
              <Checkbox>Имэйл мэдэгдэл авах</Checkbox>
              <br />
            </Card>
          </Col>

          <Col xs={24} md={24} lg={8}>
            <Card title="Тухай">
              {user?.birthYear && <p>📅 {user.birthYear}</p>}
              {user?.province && (
                <p>📍 {user.province}{user?.district ? `, ${user.district}` : ""}</p>
              )}
              {user?.school && <p>🏫 {user.school}</p>}
              {user?.grade && <p>📚 {user.grade}</p>}
            </Card>
            <Card title="Холбоо барих" style={{ marginTop: 20 }}>
              {user?.phone && <p>📞 {user.phone}</p>}
              {user?.email && <p>✉ {user.email}</p>}
            </Card>
          </Col>
        </Row>
      </div>
    </ConfigProvider>
  );
}