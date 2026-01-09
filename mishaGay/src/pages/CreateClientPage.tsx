import { FC, useState, FormEvent, useEffect } from "react";
import { Layout } from "../components/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { clientsAPI } from "../api/clients";
import { ErrorMessage } from "../components/ErrorMessage";
import { CLIENT_TAGS, type ClientTag } from "../types/client.types";
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
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [email, setEmail] = useState("");
  const [registrationAddress, setRegistrationAddress] = useState({
    region: "",
    street: ""
  });
  const [livingAddress, setLivingAddress] = useState({
    region: "",
    street: ""
  });
  const [birthDate, setBirthDate] = useState("");
  const [comment, setComment] = useState("");
  const [tag, setTag] = useState<ClientTag | "">("");

  // Паспорт
  const [series, setSeries] = useState("");
  const [number, setNumber] = useState("");
  const [issuedBy, setIssuedBy] = useState("");
  const [subdivisionCode, setSubdivisionCode] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [inn, setInn] = useState("");

  // Фото (4 слота: 0-1 основные, 2-3 дополнительные)
  type PhotoSlot = { file: File | null; preview?: string };
  const [photos, setPhotos] = useState<PhotoSlot[]>([
    { file: null, preview: undefined },
    { file: null, preview: undefined },
    { file: null, preview: undefined },
    { file: null, preview: undefined }
  ]);

  // Чистим object URLs при размонтировании
  useEffect(() => {
    return () => {
      photos.forEach((p) => {
        if (p.preview) URL.revokeObjectURL(p.preview);
      });
    };
  }, [photos]);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const fullName = `${lastName} ${firstName} ${middleName}`.trim();

  // 🔽 ПОДТЯГИВАЕМ ДАННЫЕ ПРИ РЕДАКТИРОВАНИИ
  useEffect(() => {
    if (!isEdit || !id) return;

    const clientId = Number(id);
    if (isNaN(clientId) || clientId <= 0) {
      setError("Неверный ID клиента");
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    clientsAPI.getById(clientId)
      .then((client) => {
        // Разбиваем fullName на части
        const nameParts = (client.fullName || "").trim().split(/\s+/);
        setLastName(nameParts[0] || "");
        setFirstName(nameParts[1] || "");
        setMiddleName(nameParts.slice(2).join(" ") || "");

        setPhone(client.phone || "");
        setWhatsappPhone(client.whatsappPhone || client.phone || "");
        setEmail(client.email || "");
        setRegistrationAddress({
          region: client.registrationAddress?.region || "",
          street: client.registrationAddress?.street || ""
        });
        setLivingAddress({
          region: client.livingAddress?.region || "",
          street: client.livingAddress?.street || ""
        });
        setBirthDate(client.birthDate || "");
        setComment(client.comment || "");
        setTag(client.tag || "");

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
        whatsappPhone: (whatsappPhone || phone || "").trim() || undefined,
        email: email || undefined,
        registrationAddress:
          registrationAddress.region || registrationAddress.street
            ? registrationAddress
            : undefined,
        livingAddress:
          livingAddress.region || livingAddress.street
            ? livingAddress
            : undefined,
        birthDate: birthDate || undefined,
        comment: comment || undefined,
        tag: tag || undefined,
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
        const clientId = Number(id);
        if (isNaN(clientId) || clientId <= 0) {
          setError("Неверный ID клиента");
          return;
        }
        client = await clientsAPI.update(clientId, clientData);
      } else {
        client = await clientsAPI.create(clientData);
      }

      // ⬇️ загрузка фото НЕ влияет на итог
      const uploadFiles = photos.map(p => p.file).filter(Boolean) as File[];

      if (uploadFiles.length > 0 && client.id) {
        try {
          await clientsAPI.uploadImages(client.id, uploadFiles);
        } catch (e) {
          console.warn("Фото не загрузились:", e);
          alert("Клиент создан, но фото загрузить не удалось. Можно добавить позже.");
        }
      }

      // ⬇️ ВСЕГДА возвращаемся в список клиентов
      navigate("/clients");



      // После редактирования возвращаемся на список клиентов
      // После создания переходим на детальную страницу
      if (isEdit) {
        navigate("/clients");
      } else {
        if (client.id && !isNaN(Number(client.id)) && Number(client.id) > 0) {
          navigate(`/clients`);
        } else {
          navigate("/clients");
        }
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
              <div>
                <label>Фамилия *</label>
                <input placeholder="Фамилия *" value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
              <div>
                <label>Имя *</label>
                <input placeholder="Имя *" value={firstName} onChange={e => setFirstName(e.target.value)} />
              </div>
              <div>
                <label>Отчество</label>
                <input placeholder="Отчество" value={middleName} onChange={e => setMiddleName(e.target.value)} />
              </div>
            </div>

            <div className="grid-2">
              <div>
                <label>Телефон *</label>
                <input placeholder="Телефон *" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div>
                <label>Email</label>
                <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>

            <div>
              <label>WhatsApp телефон</label>
              <input
                placeholder="Введите WhatsApp номер (по умолчанию как телефон)"
                value={whatsappPhone}
                onChange={e => setWhatsappPhone(e.target.value)}
              />
            </div>

          <section>
            <h2>Адреса</h2>

            <div className="grid-2">
              <div>
                <label>Регистрация — регион / город</label>
                <input
                  placeholder="Регион / город"
                  value={registrationAddress.region}
                  onChange={e =>
                    setRegistrationAddress(a => ({ ...a, region: e.target.value }))
                  }
                />
              </div>

              <div>
                <label>Регистрация — улица / дом / кв</label>
                <input
                  placeholder="Улица / дом / кв"
                  value={registrationAddress.street}
                  onChange={e =>
                    setRegistrationAddress(a => ({ ...a, street: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid-2">
              <div>
                <label>Проживание — регион / город</label>
                <input
                  placeholder="Регион / город"
                  value={livingAddress.region}
                  onChange={e =>
                    setLivingAddress(a => ({ ...a, region: e.target.value }))
                  }
                />
              </div>

              <div>
                <label>Проживание — улица / дом / кв</label>
                <input
                  placeholder="Улица / дом / кв"
                  value={livingAddress.street}
                  onChange={e =>
                    setLivingAddress(a => ({ ...a, street: e.target.value }))
                  }
                />
              </div>
            </div>
          </section>

            <div>
              <label>Дата рождения</label>
              <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} />
            </div>
          </section>

          {/* ---- Паспорт ---- */}
          <section>
            <h2>Паспорт</h2>

            <div className="grid-2">
              <div>
                <label>Серия</label>
                <input placeholder="Серия" value={series} onChange={e => setSeries(e.target.value)} />
              </div>
              <div>
                <label>Номер</label>
                <input placeholder="Номер" value={number} onChange={e => setNumber(e.target.value)} />
              </div>
            </div>

            <div>
              <label>Кем выдан</label>
              <input placeholder="Кем выдан" value={issuedBy} onChange={e => setIssuedBy(e.target.value)} />
            </div>

            <div className="grid-2">
              <div>
                <label>Код подразделения</label>
                <input placeholder="Код подразделения" value={subdivisionCode} onChange={e => setSubdivisionCode(e.target.value)} />
              </div>
              <div>
                <label>Дата выдачи</label>
                <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
              </div>
            </div>

            <div>
              <label>ИНН</label>
              <input placeholder="ИНН" value={inn} onChange={e => setInn(e.target.value)} />
            </div>
          </section>

          {/* ---- Тег ---- */}
          <section>
            <div>
              <label>Тег клиента</label>
              <select 
                value={tag} 
                onChange={e => setTag(e.target.value as ClientTag | "")}
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                  width: "100%",
                  fontFamily: "inherit"
                }}
              >
                <option value="">Не выбран</option>
                {CLIENT_TAGS.map(tagOption => (
                  <option key={tagOption} value={tagOption}>
                    {tagOption}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* ---- Фото ---- */}
          <section>
            <h2>Фото документов</h2>
            <p style={{ marginTop: -4, marginBottom: 12, color: "#6b7280" }}>
              1 и 2 — основные, 3 и 4 — дополнительные. По одному файлу в слот.
            </p>

            <div className="photo-grid">
              {[0, 1, 2, 3].map((idx) => {
                const slot = photos[idx];
                const label = idx < 2 ? `Основное фото ${idx + 1}` : `Доп. фото ${idx - 1}`;
                return (
                  <div key={idx} className="photo-slot">
                    <div className="photo-slot__thumb">
                      {slot.preview ? (
                        <img src={slot.preview} alt={label} />
                      ) : (
                        <span>Нет превью</span>
                      )}
                    </div>
                    <label className="photo-slot__upload">
                      {slot.file ? "Заменить" : "Загрузить"} — {label}
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setPhotos((prev) =>
                            prev.map((p, i) => {
                              if (i !== idx) return p;
                              if (p.preview) {
                                URL.revokeObjectURL(p.preview);
                              }
                              return file
                                ? { file, preview: URL.createObjectURL(file) }
                                : { file: null, preview: undefined };
                            })
                          );
                        }}
                      />
                    </label>
                    {slot.file && (
                      <button
                        type="button"
                        className="photo-slot__remove"
                        onClick={() =>
                          setPhotos((prev) =>
                            prev.map((p, i) => {
                              if (i !== idx) return p;
                              if (p.preview) URL.revokeObjectURL(p.preview);
                              return { file: null, preview: undefined };
                            })
                          )
                        }
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <button type="submit" disabled={loading || loadingData}>
            {loading ? "Сохранение..." : isEdit ? "Сохранить изменения" : "Создать клиента"}
          </button>
        </form>
      </div>
    </Layout>
  );
};

