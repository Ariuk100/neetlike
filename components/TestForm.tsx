"use client";

import { useEffect } from "react";
import { Modal, Form, Input, Select, Button, Row, Col, InputNumber, Upload } from "antd";
import { UploadOutlined } from "@ant-design/icons";

const { Option } = Select;
const { TextArea } = Input;

// Form дээрх өгөгдлийн бүтэц
export interface TestFormValues {
  id?: string;
  title: string;         
  type: string;          
  score: number;         
  timeLimit: number;     
  source: string;        
  description?: string;  
  category: string;      
  difficulty: string;    
  bloom: string;         
  question: string;      
  questionImage?: string;
  options: { A: string; B: string; C: string; D: string; E?: string };
  optionImages?: { A?: string; B?: string; C?: string; D?: string; E?: string };
  correctAnswer: string; 
  explanation?: string;  
  explanationImage?: string;
}

interface TestFormModalProps {
  open: boolean;
  mode: "add" | "edit";
  initialValues?: Partial<TestFormValues>;
  onCancel: () => void;
  onSave: (values: TestFormValues) => void;  // энд form-ын structure-г ашиглаж байна
}

export default function TestFormModal({
  open,
  mode,
  initialValues,
  onCancel,
  onSave,
}: TestFormModalProps) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
    } else {
      form.resetFields();
    }
  }, [initialValues, form]);

  return (
    <Modal
      open={open}
      title={mode === "add" ? "Шинэ тест нэмэх" : "Тест засах"}
      onCancel={onCancel}
      footer={null}
      width={900}
    >
      <Form form={form} layout="vertical" onFinish={onSave}>
        {/* Эхний мөр – нэр ба төрөл */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Нэр"
              name="title"
              rules={[{ required: true, message: "Нэр оруулна уу" }]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Төрөл"
              name="type"
              rules={[{ required: true, message: "Төрөл сонгоно уу" }]}
            >
              <Select placeholder="Сонгоно уу">
                <Option value="IGCSE">IGCSE</Option>
                <Option value="IB">IB</Option>
                <Option value="SAT">SAT</Option>
                <Option value="AP">AP</Option>
                <Option value="MONGOL">MONGOL</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Оноо, хугацаа, эх сурвалж */}
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Оноо" name="score" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Хугацаа (мин)"
              name="timeLimit"
              rules={[{ required: true }]}
            >
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Эх сурвалж" name="source">
              <Input />
            </Form.Item>
          </Col>
        </Row>

        {/* Хичээл, хүндрэл, bloom */}
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="Хичээл" name="category" rules={[{ required: true }]}>
              <Select>
                <Option value="Физик">Физик</Option>
                <Option value="Математик">Математик</Option>
                <Option value="Хими">Хими</Option>
                <Option value="Биологи">Биологи</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Хүндрэл" name="difficulty" rules={[{ required: true }]}>
              <Select>
                <Option value="Хялбар">Хялбар</Option>
                <Option value="Дунд">Дунд</Option>
                <Option value="Хүнд">Хүнд</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Bloom түвшин" name="bloom" rules={[{ required: true }]}>
              <Select>
                <Option value="Сэргээн санах">Сэргээн санах</Option>
                <Option value="Ойлгох">Ойлгох</Option>
                <Option value="Хэрэглэх">Хэрэглэх</Option>
                <Option value="Задлан шинжлэх">Задлан шинжлэх</Option>
                <Option value="Үнэлэх">Үнэлэх</Option>
                <Option value="Бүтээх">Бүтээх</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Асуулт + зураг */}
        <Form.Item label="Асуулт" name="question" rules={[{ required: true }]}>
          <TextArea rows={3} />
        </Form.Item>
        <Form.Item label="Асуултын зураг" name="questionImage">
          <Upload>
            <Button icon={<UploadOutlined />}>Зураг оруулах</Button>
          </Upload>
        </Form.Item>

        {/* Сонголтууд */}
        <Row gutter={16}>
          {["A", "B", "C", "D", "E"].map((opt) => (
            <Col span={12} key={opt}>
              <Form.Item label={`Сонголт ${opt}`} name={["options", opt]}>
                <Input placeholder={`${opt} хариулт`} />
              </Form.Item>
              <Form.Item label={`Сонголт ${opt} зураг`} name={["optionImages", opt]}>
                <Upload>
                  <Button icon={<UploadOutlined />}>Зураг оруулах</Button>
                </Upload>
              </Form.Item>
            </Col>
          ))}
        </Row>

        {/* Зөв хариу */}
        <Form.Item
          label="Зөв хариу"
          name="correctAnswer"
          rules={[{ required: true, message: "Зөв хариу сонгоно уу" }]}
        >
          <Select>
            {["A", "B", "C", "D", "E"].map((opt) => (
              <Option key={opt} value={opt}>
                {opt}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {/* Бодолт + зураг */}
        <Form.Item label="Бодолт" name="explanation">
          <TextArea rows={3} />
        </Form.Item>
        <Form.Item label="Бодолтын зураг" name="explanationImage">
          <Upload>
            <Button icon={<UploadOutlined />}>Зураг оруулах</Button>
          </Upload>
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" block>
            {mode === "add" ? "Нэмэх" : "Хадгалах"}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
}