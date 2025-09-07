// app/moderator/tests/page.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Timestamp,
  collection,
  getDocs,
  orderBy,
  query,
  limit,
  where,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData,
  getCountFromServer,
  doc,
  deleteDoc,
  updateDoc,        // <-- add
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Button,
  Card,
  Row,
  Col,
  Tag,
  Select,
  Input,
  ConfigProvider,
  theme,
  Pagination,
  Dropdown,
  Spin,
  message,
  Modal,            // <-- add
} from "antd";
import { MoreOutlined, PlusOutlined } from "@ant-design/icons";
import LatexRenderer from "@/components/LatexRenderer";
import { useCacheContext } from "@/lib/CacheContext";

// *** Import your existing form component here ***
import TestForm, { TestFormValues as TestFormModalValues } from "@/components/TestForm"; // <--- замаа өөрийн төслийнхөөр тааруулна

interface TestItem {
  id: string;
  questionNumber: number;
  question: string;
  questionImage?: string;
  options: string[];
  optionImages?: (string | null)[];
  explanation?: string;
  explanationImage?: string;
  correctAnswer?: string;
  difficulty?: string;
  bloom?: string;
  source?: string;
  subject?: string;
  createdAt: string;
}

type TestFormValues = {
  // Танай TestForm-аас буцах талбаруудыг энд тодорхойлно
  questionNumber?: number;
  question?: string;
  questionImage?: string | null;
  options?: string[];
  optionImages?: (string | null)[];
  explanation?: string | null;
  explanationImage?: string | null;
  correctAnswer?: string | null;
  difficulty?: string | null;
  bloom?: string | null;
  source?: string | null;
  subject?: string | null;
  // нэмэлт талбар байвал үргэлжлүүлж болно...
};

const { Option } = Select;
const { Search } = Input;

/* -------------------- Helpers -------------------- */
function formatYMDLocal(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function tsToDateStringAny(v: unknown): string {
  try {
    if (v instanceof Timestamp) return formatYMDLocal(v.toDate());
    if (v instanceof Date) return formatYMDLocal(v);
    if (typeof v === "string") {
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? "" : formatYMDLocal(d);
    }
    if (typeof v === "number") {
      const ms = v < 1e12 ? v * 1000 : v;
      const d = new Date(ms);
      return Number.isNaN(d.getTime()) ? "" : formatYMDLocal(d);
    }
  } catch {}
  return "";
}

const R2_ACC = process.env.NEXT_PUBLIC_R2_ACCOUNT_ID;
function toPublicImageUrl(imageKey?: string | null): string | null {
  if (!imageKey) return null;
  const k = String(imageKey).trim();
  if (!k) return null;
  if (/^https?:\/\//i.test(k)) return k;
  if (!R2_ACC) return k;
  return `https://pub-${R2_ACC}.r2.dev/${encodeURIComponent(k)}`;
}

const PAGE_SIZE = 10;
function makeFilterKey(difficulty: string, bloom: string, subject: string) {
  return JSON.stringify({ difficulty, bloom, subject });
}
/* ------------------------------------------------- */

export default function TestsPage() {
  const [isDark, setIsDark] = useState(false);
  const cache = useCacheContext();

  // UI state
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = PAGE_SIZE;

  // filters
  const [difficulty, setDifficulty] = useState("all");
  const [bloom, setBloom] = useState("all");
  const [moderator, setModerator] = useState("all");
  const [subject, setSubject] = useState("all");
  const [topic, setTopic] = useState("all");
  const [subtopic, setSubtopic] = useState("all");
  const [qtype, setQtype] = useState("all");

  // pagination/cache
  const [total, setTotal] = useState<number>(0);
  const [pages, setPages] = useState<TestItem[][]>([]);
  const lastDocsRef = useRef<QueryDocumentSnapshot<DocumentData>[]>([]);
  const [filterKey, setFilterKey] = useState<string>(() =>
    makeFilterKey(difficulty, bloom, subject)
  );

  // ===== EDIT MODAL =====
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<TestItem | null>(null);

  // Theme detect
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    setIsDark(html.classList.contains("dark"));
    const observer = new MutationObserver(() =>
      setIsDark(html.classList.contains("dark"))
    );
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  function buildBaseQuery() {
    const col = collection(db, "test");
    const clauses: ReturnType<typeof where>[] = [];
    if (difficulty !== "all") clauses.push(where("difficulty", "==", difficulty));
    if (bloom !== "all") clauses.push(where("bloom", "==", bloom));
    if (subject !== "all") clauses.push(where("subject", "==", subject));
    let qRef = query(col, orderBy("createdAt", "desc"), limit(pageSize));
    if (clauses.length) {
      qRef = query(col, ...clauses, orderBy("createdAt", "desc"), limit(pageSize));
    }
    return qRef;
  }

  async function loadTotalCount(keyForCache: string) {
    try {
      const col = collection(db, "test");
      const clauses: ReturnType<typeof where>[] = [];
      if (difficulty !== "all") clauses.push(where("difficulty", "==", difficulty));
      if (bloom !== "all") clauses.push(where("bloom", "==", bloom));
      if (subject !== "all") clauses.push(where("subject", "==", subject));
      const qRef = clauses.length ? query(col, ...clauses) : col;
      const snap = await getCountFromServer(qRef);
      const count = snap.data().count;
      setTotal(count);
      cache.set(`tests_total_${keyForCache}`, count);
      return count;
    } catch (e) {
      console.error("count error:", e);
      return 0;
    }
  }

  function setBundleCache(keyForCache: string, mergedPages: TestItem[][], knownTotal?: number) {
    const flatLen = mergedPages.flat().length;
    cache.set(`tests_data_${keyForCache}`, {
      pages: mergedPages,
      total: typeof knownTotal === "number" ? knownTotal : flatLen,
    });
  }

  // Reset when filters change
  useEffect(() => {
    const key = makeFilterKey(difficulty, bloom, subject);
    setFilterKey(key);

    const bulk = cache.get<{ pages: TestItem[][]; total: number }>(`tests_data_${key}`);
    const cachedTotal = cache.get<number>(`tests_total_${key}`);

    if (bulk && Array.isArray(bulk.pages)) {
      setPages(bulk.pages);
      setTotal(typeof cachedTotal === "number" ? cachedTotal : bulk.total || 0);
      lastDocsRef.current = []; // cursors must rebuild
      setCurrentPage(1);
      setLoading(false);
    } else {
      setPages([]);
      lastDocsRef.current = [];
      setCurrentPage(1);
      void loadPage(1, key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, bloom, subject]);

  // Live subscribe single page cache
  useEffect(() => {
    const pageCacheKey = `tests_page_${filterKey}_${currentPage}`;
    const unsubscribe = cache.subscribe(pageCacheKey, (_, updatedPageData) => {
      if (updatedPageData) {
        setPages((prev) => {
          const cloned = prev.slice();
          cloned[currentPage - 1] = updatedPageData as TestItem[];
          setBundleCache(filterKey, cloned, total);
          return cloned;
        });
      }
    });
    return () => unsubscribe();
  }, [cache, currentPage, filterKey, total]);

  async function loadPage(targetPage: number, keyForCache: string = filterKey) {
    setLoading(true);
    const pageCacheKey = `tests_page_${keyForCache}_${targetPage}`;

    const cachedTotal = cache.get<number>(`tests_total_${keyForCache}`);
    if (typeof cachedTotal === "number") {
      setTotal(cachedTotal);
    } else {
      await loadTotalCount(keyForCache);
    }

    const cachedPageData = cache.get<TestItem[]>(pageCacheKey);
    if (cachedPageData) {
      setPages((prev) => {
        const cloned = prev.slice();
        cloned[targetPage - 1] = cachedPageData;
        setBundleCache(keyForCache, cloned, total);
        return cloned;
      });
      setCurrentPage(targetPage);
      setLoading(false);
      return;
    }

    try {
      let qRef = buildBaseQuery();
      if (targetPage > 1) {
        const neededIndex = targetPage - 2;
        if (!lastDocsRef.current[neededIndex]) {
          await loadPage(targetPage - 1, keyForCache);
        }
        const lastDoc = lastDocsRef.current[neededIndex];
        if (lastDoc) qRef = query(qRef, startAfter(lastDoc));
      }

      const snap = await getDocs(qRef);
      const newRows: TestItem[] = [];
      snap.forEach((doc) => {
        const d = doc.data() as Record<string, unknown>;
        newRows.push({
          id: doc.id,
          questionNumber: (d.questionNumber as number) ?? 0,
          question: (d.question as string) ?? "",
          questionImage: (d.questionImage as string) || "",
          options: (d.options as string[]) || [],
          optionImages: (d.optionImages as (string | null)[]) || [],
          explanation: (d.explanation as string) || "",
          explanationImage: (d.explanationImage as string) || "",
          correctAnswer: (d.correctAnswer as string) || "",
          difficulty: (d.difficulty as string) || "",
          bloom: (d.bloom as string) || "",
          source: (d.source as string) || "",
          subject: (d.subject as string) || "",
          createdAt: tsToDateStringAny(d.createdAt),
        });
      });

      cache.set(pageCacheKey, newRows);
      setPages((prev) => {
        const cloned = prev.slice();
        cloned[targetPage - 1] = newRows;
        setBundleCache(keyForCache, cloned, total);
        return cloned;
      });

      const lastDoc = snap.docs[snap.docs.length - 1] || null;
      if (lastDoc) {
        lastDocsRef.current[targetPage - 1] = lastDoc;
      }

      setCurrentPage(targetPage);
    } catch (e) {
      console.error(e);
      message.error("Хуудас татах үед алдаа гарлаа.");
    } finally {
      setLoading(false);
    }
  }

  // ===== EDIT MODAL: open/close/save =====
  function handleEditOpen(test: TestItem) {
    setEditingTest(test);
    setEditModalOpen(true);
  }
  function handleEditCancel() {
    setEditModalOpen(false);
    setEditingTest(null);
  }

  async function handleEditSave(values: TestFormModalValues) {
    if (!editingTest) return;

    const hide = message.loading("Хадгалж байна...", 0);
    try {
      // 1) Firestore-д шинэчлэх талбаруудыг бүтээнэ (хоосон/undefined-ыг алгасах)
      const updates: Record<string, unknown> = {};
      const entries = Object.entries(values) as Array<[keyof TestFormValues, unknown]>;
      for (const [k, v] of entries) {
        if (v !== undefined) updates[k as string] = v;
      }
      // анхны талбар нэртэй таарч байгаа (question, options, ...)

      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, "test", editingTest.id), updates);
      }

      // 2) Local state & caches update
      const patched: TestItem = {
        ...editingTest,
        ...updates,
      } as TestItem;

      setPages((prev) => {
        const cloned = prev.map((arr) =>
          arr ? arr.map((row) => (row.id === patched.id ? { ...row, ...patched } : row)) : arr
        );
        // одоогийн хуудсын per-page cache
        const curKey = `tests_page_${filterKey}_${currentPage}`;
        const curList = cloned[currentPage - 1] || [];
        cache.set(curKey, curList);
        // bulk cache
        setBundleCache(filterKey, cloned, total);
        return cloned;
      });

      message.success("Амжилттай хадгаллаа.");
      setEditModalOpen(false);
      setEditingTest(null);
    } catch (e) {
      console.error("update error:", e);
      message.error("Хадгалах үед алдаа гарлаа.");
    } finally {
      hide();
    }
  }

  // Delete
  const handleMenuClick = async (action: string, testId: string) => {
    if (action === "edit") {
      const list = pages[currentPage - 1] || [];
      const t = list.find((x) => x.id === testId);
      if (t) handleEditOpen(t);
      return;
    }
    if (action !== "delete") return;

    const hide = message.loading("Устгаж байна...", 0);
    try {
      await deleteDoc(doc(db, "test", testId));

      setPages((prev) => {
        const cloned = prev.slice();
        const idx = currentPage - 1;
        const list = (cloned[idx] || []).filter((x) => x.id !== testId);
        cloned[idx] = list;
        cache.set(`tests_page_${filterKey}_${currentPage}`, list);
        setBundleCache(filterKey, cloned, Math.max(0, total - 1));
        return cloned;
      });

      const newTotal = Math.max(0, total - 1);
      setTotal(newTotal);
      cache.set(`tests_total_${filterKey}`, newTotal);

      const currentList = pages[currentPage - 1] || [];
      if (currentList.length <= 1 && currentPage > 1) {
        await loadPage(currentPage - 1);
      }

      message.success("Амжилттай устгалаа.");
    } catch (e) {
      console.error("Delete error:", e);
      message.error("Устгах үед алдаа гарлаа.");
    } finally {
      hide();
    }
  };

  const currentItems = useMemo(() => {
    const items = pages[currentPage - 1] || [];
    const text = q.trim().toLowerCase();
    if (!text) return items;
    return items.filter((t) => {
      const hay = `${t.question} ${t.explanation ?? ""}`.toLowerCase();
      return hay.includes(text);
    });
  }, [pages, currentPage, q]);

  const menuItems = [
    { key: "edit", label: "Засах" },
    { key: "delete", label: "Устгах" },
  ];

  return (
    <ConfigProvider
      theme={{ algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm }}
    >
      <div style={{ background: isDark ? "#141414" : "#f5f6fa", minHeight: "100vh", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 1400, margin: "0 auto", paddingLeft: 26, paddingRight: 26 }}>
          {/* Toolbar */}
          <Row gutter={[12, 12]} align="middle" style={{ marginBottom: 24 }}>
            <Col xs={24} span={18}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                <Select value={difficulty} onChange={setDifficulty}>
                  <Option value="all">Хүндрэл</Option>
                  <Option value="хялбар">Хялбар</Option>
                  <Option value="дунд">Дунд</Option>
                  <Option value="хүнд">Хүнд</Option>
                </Select>

                <Select value={bloom} onChange={setBloom}>
                  <Option value="all">Bloom</Option>
                  <Option value="сэргээн санах">Сэргээн санах</Option>
                  <Option value="ойлгох">Ойлгох</Option>
                  <Option value="хэрэглэх">Хэрэглэх</Option>
                  <Option value="задлан шинжлэх">Задлан шинжлэх</Option>
                  <Option value="үнэлэх">Үнэлэх</Option>
                  <Option value="бүтээх">Бүтээх</Option>
                </Select>

                <Select value={moderator} onChange={setModerator}>
                  <Option value="all">Модератор</Option>
                </Select>

                <Select value={subject} onChange={setSubject}>
                  <Option value="all">Хичээл</Option>
                  <Option value="физик">Физик</Option>
                  <Option value="математик">Математик</Option>
                  <Option value="хими">Хими</Option>
                  <Option value="биологи">Биологи</Option>
                </Select>

                <Select value={topic} onChange={setTopic}>
                  <Option value="all">Сэдэв</Option>
                </Select>

                <Select value={subtopic} onChange={setSubtopic}>
                  <Option value="all">Дэд сэдэв</Option>
                </Select>

                <Select value={qtype} onChange={setQtype}>
                  <Option value="all">Төрөл</Option>
                  <Option value="choice-single">Нэг сонголттой</Option>
                  <Option value="choice-multiple">Олон сонголттой</Option>
                  <Option value="open">Задгай</Option>
                </Select>
              </div>
            </Col>

            <Col xs={24} span={6}>
              <div style={{ display: "flex", gap: 12 }}>
                <Search placeholder="Хайх" value={q} onChange={(e) => setQ(e.target.value)} allowClear />
                <Button type="primary" icon={<PlusOutlined />}>Шинэ тест</Button>
              </div>
            </Col>
          </Row>

          {loading ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <Spin />
            </div>
          ) : (
            <>
              {/* Tests list */}
              <Row gutter={[16, 16]}>
                {currentItems.map((t) => (
                  <Col xs={24} key={t.id}>
                    <Card
                      hoverable
                      title={
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <div>
                            <Tag color="blue">#{t.questionNumber}</Tag>
                            <Tag>{t.subject}</Tag>
                            {t.difficulty && <Tag color="red">{t.difficulty}</Tag>}
                            {t.bloom && <Tag color="purple">{t.bloom}</Tag>}
                            {t.source && <Tag color="green">{t.source}</Tag>}
                            <span style={{ marginLeft: 8, color: "#888" }}>{t.createdAt}</span>
                          </div>
                          <Dropdown
                            menu={{ items: menuItems, onClick: ({ key }) => handleMenuClick(key, t.id) }}
                            trigger={["click"]}
                          >
                            <MoreOutlined style={{ fontSize: 18, cursor: "pointer" }} />
                          </Dropdown>
                        </div>
                      }
                    >
                      <h3 style={{ marginBottom: 12, lineHeight: 1.5, fontSize: 18 }}>
                        <LatexRenderer text={t.question} />
                      </h3>

                      {t.questionImage && (
                        <div style={{ margin: "12px 0 16px 0", border: "1px solid #eaeaea", borderRadius: 8, padding: 8, background: "#fafafa" }}>
                          <img src={toPublicImageUrl(t.questionImage) || ""} alt="Question" style={{ maxWidth: "100%", display: "block", margin: "0 auto" }} />
                        </div>
                      )}

                      <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                        {t.options.map((opt, i) => {
                          if (!opt) return null;
                          const letter = String.fromCharCode(65 + i);
                          const correctSet = new Set(
                            String(t.correctAnswer || "")
                              .split(",")
                              .map((s) => s.trim().toUpperCase())
                              .filter(Boolean)
                          );
                          const isCorrect = correctSet.has(letter);

                          return (
                            <div
                              key={i}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 10,
                                border: `1px solid ${isCorrect ? "#52c41a" : "#eaeaea"}`,
                                background: isCorrect ? "rgba(82,196,26,0.08)" : "#fff",
                                borderRadius: 10,
                                padding: "10px 12px",
                              }}
                            >
                              <div
                                style={{
                                  minWidth: 28,
                                  height: 28,
                                  borderRadius: 6,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontWeight: 600,
                                  background: isCorrect ? "#52c41a" : "#f0f0f0",
                                  color: isCorrect ? "#fff" : "#333",
                                }}
                                title={isCorrect ? "Зөв хариулт" : undefined}
                              >
                                {letter}
                              </div>

                              <div style={{ flex: 1, lineHeight: 1.5 }}>
                                <LatexRenderer text={opt} />
                              </div>

                              {t.optionImages?.[i] && (
                                <div style={{ marginLeft: "auto", border: "1px solid #eaeaea", borderRadius: 8, padding: 4, background: "#fafafa" }}>
                                  <img
                                    src={toPublicImageUrl(t.optionImages[i]) || ""}
                                    alt={`Option ${i + 1}`}
                                    style={{ width: 96, height: 72, objectFit: "contain", display: "block" }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ marginTop: 18, padding: 12, borderRadius: 10, border: "1px solid #eaeaea", background: "#fafafa" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <span style={{ width: 6, height: 18, borderRadius: 3, background: "#1677ff", display: "inline-block" }} />
                          <h4 style={{ margin: 0, fontWeight: 600 }}>Бодолт</h4>
                        </div>

                        {t.explanation ? (
                          <div style={{ lineHeight: 1.6 }}>
                            <LatexRenderer text={t.explanation} />
                          </div>
                        ) : (
                          <p style={{ margin: 0, color: "#888" }}>(Бодолт оруулаагүй)</p>
                        )}

                        {t.explanationImage && (
                          <div style={{ marginTop: 12, border: "1px solid #eaeaea", borderRadius: 8, padding: 8, background: "#fff" }}>
                            <img src={toPublicImageUrl(t.explanationImage) || ""} alt="Explanation" style={{ maxWidth: "100%", display: "block", margin: "0 auto" }} />
                          </div>
                        )}
                      </div>

                      {t.correctAnswer && (
                        <div style={{ marginTop: 12, fontWeight: 600 }}>
                          ✅ Зөв хариулт: <span style={{ color: "#52c41a" }}>{t.correctAnswer}</span>
                        </div>
                      )}
                    </Card>
                  </Col>
                ))}
              </Row>

              <div style={{ textAlign: "center", marginTop: 24 }}>
                <Pagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={total}
                  showSizeChanger={false}
                  onChange={(p) => void loadPage(p)}
                />
              </div>
            </>
          )}

          {/* ===== EDIT MODAL (TestForm) ===== */}
          <Modal
            title={editingTest ? `Тест засах #${editingTest.questionNumber}` : "Тест засах"}
            open={editModalOpen}
            onCancel={handleEditCancel}
            footer={null}
            destroyOnClose
            width={900}
          >
            {editingTest && (
              <TestForm
                open={true}
                mode="edit"
                initialValues={{
                  // Танай TestForm-д тохируулан map-лаарай
                  question: editingTest.question,
                  questionImage: editingTest.questionImage ?? undefined,
                  options: (typeof editingTest.options === 'object' && !Array.isArray(editingTest.options) && editingTest.options !== null) 
                    ? {
                        A: (editingTest.options as any).A || "",
                        B: (editingTest.options as any).B || "",
                        C: (editingTest.options as any).C || "",
                        D: (editingTest.options as any).D || "",
                        E: (editingTest.options as any).E || ""
                      }
                    : { A: "", B: "", C: "", D: "", E: "" },
                  optionImages: (typeof editingTest.optionImages === 'object' && !Array.isArray(editingTest.optionImages) && editingTest.optionImages !== null) 
                    ? editingTest.optionImages as { A?: string; B?: string; C?: string; D?: string; E?: string } 
                    : { A: "", B: "", C: "", D: "", E: "" },
                  explanation: editingTest.explanation ?? "",
                  explanationImage: editingTest.explanationImage ?? undefined,
                  correctAnswer: editingTest.correctAnswer ?? "",
                  difficulty: editingTest.difficulty ?? "",
                  bloom: editingTest.bloom ?? "",
                  source: editingTest.source ?? "",
                }}
                onSave={(vals: TestFormModalValues) => handleEditSave(vals)}
                onCancel={handleEditCancel}
              />
            )}
          </Modal>
        </div>
      </div>
    </ConfigProvider>
  );
}