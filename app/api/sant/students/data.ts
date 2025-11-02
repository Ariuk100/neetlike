
export type Student = {
    class: string;         // ж: "10A"
    code: string;          // ж: "A12345"
    name: string;          // ж: "Бат"
    extra?: Record<string, unknown>; // нэмэлт талбарууд байж болно
  };
  
  // ЖИШЭЭ өгөгдөл
  export const STUDENTS: Student[] = [
    { class: "10A", code: "123", name: "Бат" },
    { class: "10A", code: "124", name: "Сараа" },
    { class: "10B", code: "201", name: "Наран" },
  ];