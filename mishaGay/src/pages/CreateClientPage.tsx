import { FC, useState, FormEvent, useEffect } from "react";
import { Layout } from "../components/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { clientsAPI } from "../api/clients";
import { ErrorMessage } from "../components/ErrorMessage";
import "../styles/create-client.css";

export const CreateClientPage: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  // ФИО
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");

  // Основное
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [comment, setComment] = useState("");

  // Паспорт
  const [series, setSeries] = useState("");
  const [number, setNumber] = useState("");
  const [issuedBy, setIssuedBy] = useState("");
  const [subdivisionCode, setSubdivisionCode] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [inn, setInn] = useState("");

  // Фото
  const [files, setFiles] = useState<File[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const fullName = `${lastName} ${firstName} ${middleName}`.trim();

  // 🔽 ПОДТЯГИВАЕМ ДАННЫЕ ПРИ РЕДАКТИРОВАНИИ
  useEffect(() => {
    if (!isEdit || !id) return;

    setLoadingData(true);
    clientsAPI.getById(Number(id))
      .then((client) => {
        // Разбиваем fullName на части
        const nameParts = (client.fullName || "").trim().split(/\s+/);
        setLastName(nameParts[0] || "");
        setFirstName(nameParts[1] || "");
        setMiddleName(nameParts.slice(2).join(" ") || "");

        setPhone(client.phone || "");
        setEmail(client.email || "");
        setAddress(client.address || "");
        setBirthDate(client.birthDate || "");
        setComment(client.comment || "");

        if (client.passport) {
          setSeries(client.passport.series || "");
          setNumber(client.passport.number || "");
          setIssuedBy(client.passport.issuedBy || "");
          setSubdivisionCode(client.passport.subdivisionCode || "");
          setIssueDate(client.passport.issueDate || "");
          setInn(client.passport.inn || "");
        }
      })
      .catch((e: any) => {
        setError(e.message || "Ошибка загрузки данных клиента");
      })
      .finally(() => {
        setLoadingData(false);
      });
  }, [id, isEdit]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!lastName || !firstName || !phone) {
      setError("Введите фамилию, имя и телефон");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const clientData = {
        fullName,
        phone,
        email: email || undefined,
        address: address || undefined,
        birthDate: birthDate || undefined,
        comment: comment || undefined,
        passport: series || number || inn ? {
          series: series || undefined,
          number: number || undefined,
          issuedBy: issuedBy || undefined,
          subdivisionCode: subdivisionCode || undefined,
          issueDate: issueDate || undefined,
          inn: inn || undefined
        } : undefined
      };

      let client;
      if (isEdit && id) {
        client = await clientsAPI.update(Number(id), clientData);
      } else {
        client = await clientsAPI.create(clientData);
      }

      if (files.length > 0) {
        await clientsAPI.uploadImages(client.id, files);
      }

      // После редактирования возвращаемся на список клиентов
      // После создания переходим на детальную страницу
      if (isEdit) {
        navigate("/clients");
      } else {
        navigate(`/clients/${client.id}`);
      }
    } catch (e: any) {
      setError(e.message || (isEdit ? "Ошибка обновления клиента" : "Ошибка создания клиента"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="create-client-page">
        <form className="client-form-card" onSubmit={onSubmit}>
          <h1>{isEdit ? "Редактирование клиента" : "Создание клиента"}</h1>

          <ErrorMessage error={error} onClose={() => setError(null)} />

          {loadingData && (
            <div style={{ textAlign: "center", padding: "20px", color: "#666" }}>
              Загрузка данных...
            </div>
          )}

          {/* ---- Клиент ---- */}
          <section>
            <h2>Данные клиента</h2>

            <div className="grid-3">
              <input placeholder="Фамилия *" value={lastName} onChange={e => setLastName(e.target.value)} />
              <input placeholder="Имя *" value={firstName} onChange={e => setFirstName(e.target.value)} />
              <input placeholder="Отчество" value={middleName} onChange={e => setMiddleName(e.target.value)} />
            </div>

            <div className="grid-2">
              <input placeholder="Телефон *" value={phone} onChange={e => setPhone(e.target.value)} />
              <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <input placeholder="Адрес" value={address} onChange={e => setAddress(e.target.value)} />
            <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
            <textarea placeholder="Комментарий" value={comment} onChange={e => setComment(e.target.value)} />
          </section>

          {/* ---- Паспорт ---- */}
          <section>
            <h2>Паспорт</h2>

            <div className="grid-2">
              <input placeholder="Серия" value={series} onChange={e => setSeries(e.target.value)} />
              <input placeholder="Номер" value={number} onChange={e => setNumber(e.target.value)} />
            </div>

            <input placeholder="Кем выдан" value={issuedBy} onChange={e => setIssuedBy(e.target.value)} />

            <div className="grid-2">
              <input placeholder="Код подразделения" value={subdivisionCode} onChange={e => setSubdivisionCode(e.target.value)} />
              <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
            </div>

            <input placeholder="ИНН" value={inn} onChange={e => setInn(e.target.value)} />
          </section>

          {/* ---- Фото ---- */}
          <section>
            <h2>Фото документов</h2>

            <label className="upload-box">
              <input
                type="file"
                multiple
                accept="image/*"
                hidden
                onChange={e => setFiles(Array.from(e.target.files || []))}
              />
              {files.length === 0
                ? "Нажмите или перетащите файлы"
                : `Выбрано файлов: ${files.length}`}
            </label>
          </section>

          <button type="submit" disabled={loading || loadingData}>
            {loading ? "Сохранение..." : isEdit ? "Сохранить изменения" : "Создать клиента"}
          </button>
        </form>
      </div>
    </Layout>
  );
};

