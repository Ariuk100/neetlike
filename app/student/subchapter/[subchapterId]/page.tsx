"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";

interface SubchapterDetail {
  name: string;
  description: string;
  lessonContent: string; // Онолын хичээлийн HTML эсвэл markdown текст гэж үзэж болно
  problemCount: number;
  solvedCount: number;
}

export default function SubchapterDetailPage() {
  const { subchapterId } = useParams();
  const [detail, setDetail] = useState<SubchapterDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!subchapterId || typeof subchapterId !== "string") return;

      const snap = await getDoc(doc(db, "subchapters", subchapterId));
      if (snap.exists()) {
        const d = snap.data();
        setDetail({
          name: d.name,
          description: d.description || "",
          lessonContent: d.lessonContent || "", // HTML эсвэл markdown
          problemCount: d.problemCount || 0,
          solvedCount: d.solvedCount || 0,
        });
      }
      setLoading(false);
    };

    fetchData();
  }, [subchapterId]);

  return (
    <div className="p-6 max-w-screen-xl mx-auto min-h-screen bg-[#F9FAFB]">
      <div className="mb-4 text-sm text-gray-600">
        <Link href="/student/groups" className="text-blue-600 hover:underline">
          ← Бүлгүүд рүү буцах
        </Link>
      </div>

      {loading ? (
        <p>Уншиж байна...</p>
      ) : !detail ? (
        <p>Дэд бүлгийн мэдээлэл олдсонгүй.</p>
      ) : (
        <>
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2 text-[#111827]">
            <LayoutGrid size={28} className="text-[#2563EB]" />
            {detail.name}
          </h1>

          <p className="text-gray-600 mb-4 text-sm">{detail.description}</p>

          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h2 className="text-lg font-semibold mb-2">Онолын хичээл</h2>
            <div className="prose prose-sm max-w-none text-gray-800">
              {/* Энд markdown эсвэл HTML контент орж болно */}
              <div dangerouslySetInnerHTML={{ __html: detail.lessonContent }} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700 mb-1">
                <span className="font-semibold text-gray-900">
                  {detail.problemCount}
                </span>{" "}
                бодлого таныг хүлээж байна
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${
                      detail.problemCount > 0
                        ? (detail.solvedCount / detail.problemCount) * 100
                        : 0
                    }%`,
                  }}
                ></div>
              </div>
            </div>
            <Link
              href={`/student/subchapter/${subchapterId}/problems`}
              className="bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded shadow"
            >
              Бодох
            </Link>
          </div>
        </>
      )}
    </div>
  );
}