import { FC, useState, FormEvent, useEffect } from "react";
import { Layout } from "../components/Layout";
import { useNavigate, useParams } from "react-router-dom";
import { clientsAPI } from "../api/clients";
import { ErrorMessage } from "../components/ErrorMessage";
import { CLIENT_TAGS, type ClientTag } from "../types/client.types";
import { StyledSelect } from "../components/StyledSelect";
import { PinChecker } from "../components/PinChecker";
import { DatePicker } from "../components/DatePicker";
import "../styles/create-client.css";

export const CreateClientPage: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [syncAddress, setSyncAddress] = useState(!isEdit);

  // ФИО
  const [fullName, setFullName] = useState("");

  // Основное
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [additionalPhone, setAdditionalPhone] = useState("");
  const [registrationAddress, setRegistrationAddress] = useState({
    region: "",
    street: ""
  });
  const [livingAddress, setLivingAddress] = useState({
    region: "",
    street: ""
  });
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [comment, setComment] = useState("");
  const [tag, setTag] = useState<ClientTag | "">("");
  const [objectAddress, setObjectAddress] = useState("");

  // Паспорт
  const [series, setSeries] = useState("");
  const [number, setNumber] = useState("");
  const [issuedBy, setIssuedBy] = useState("");
  const [subdivisionCode, setSubdivisionCode] = useState("");
  const [issueDate, setIssueDate] = useState<Date | null>(null);
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



  // 🔽 ПОДТЯГИВАЕМ ДАННЫЕ ПРИ РЕДАКТИРОВАНИИ
  useEffect(() => {
    if (!isEdit || !id) return;

    const clientId = id;
    if (!clientId) {
      setError("Неверный ID клиента");
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    clientsAPI.getById(Number(clientId))
      .then((client) => {
        setFullName(client.fullName || "");

        setWhatsappPhone(client.whatsappPhone || "");
        setAdditionalPhone(client.additionalPhone || "");
        setRegistrationAddress({
          region: client.registrationAddress?.region || "",
          street: client.registrationAddress?.street || ""
        });
        setLivingAddress({
          region: client.livingAddress?.region || "",
          street: client.livingAddress?.street || ""
        });
        setObjectAddress(client.objectAddress || "");
        setBirthDate(client.birthDate ? new Date(client.birthDate) : null);
        setComment(client.comment || "");
        setTag(client.tag || "");

        if (client.passport) {
          setSeries(client.passport.series || "");
          setNumber(client.passport.number || "");
          setIssuedBy(client.passport.issuedBy || "");
          setSubdivisionCode(client.passport.subdivisionCode || "");
          setIssueDate(client.passport.issueDate ? new Date(client.passport.issueDate) : null);
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

    if (!fullName.trim() || !whatsappPhone) {
      setError("Введите ФИО и основной телефон (WhatsApp)");
      return;
    }

    if (inn && inn.length !== 14) {
      setError("ИНН должен содержать ровно 14 цифр");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const clientData = {
        fullName: fullName.trim(),
        whatsappPhone,
        additionalPhone: (additionalPhone || "").trim() || undefined,
        registrationAddress:
          registrationAddress.region || registrationAddress.street
            ? registrationAddress
            : undefined,
        livingAddress:
          livingAddress.region || livingAddress.street
            ? livingAddress
            : undefined,
        objectAddress: objectAddress || undefined,
        birthDate: birthDate ? `${birthDate.getFullYear()}-${String(birthDate.getMonth() + 1).padStart(2, '0')}-${String(birthDate.getDate()).padStart(2, '0')}` : undefined,
        comment: comment || undefined,
        tag: tag || undefined,
        passport: series || number || inn ? {
          series: series || undefined,
          number: number || undefined,
          issuedBy: issuedBy || undefined,
          subdivisionCode: subdivisionCode || undefined,
          issueDate: issueDate ? `${issueDate.getFullYear()}-${String(issueDate.getMonth() + 1).padStart(2, '0')}-${String(issueDate.getDate()).padStart(2, '0')}` : undefined,
          inn: inn || undefined
        } : undefined
      };

      let client;
      if (isEdit && id) {
        const clientId = Number(id);
        if (!clientId || isNaN(clientId)) {
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
        navigate("/clients");
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
        <form 
          className="client-form-card" 
          onSubmit={onSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              return;
            }
            if (["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.key)) {
              const target = e.target as HTMLInputElement;
              
              // Only move left/right if cursor is at the beginning/end of the text
              if (e.key === "ArrowLeft" && target.selectionStart !== 0) return;
              if (e.key === "ArrowRight" && target.selectionEnd !== target.value.length) return;

              const form = e.currentTarget;
              const focusable = Array.from(
                form.querySelectorAll<HTMLInputElement>('input:not([type="hidden"]):not([type="file"]):not([disabled])')
              );
              const index = focusable.indexOf(target);
              if (index > -1) {
                e.preventDefault();
                let nextIndex = 0;
                if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                  nextIndex = index + 1 < focusable.length ? index + 1 : 0;
                } else {
                  nextIndex = index > 0 ? index - 1 : focusable.length - 1;
                }
                focusable[nextIndex].focus();
              }
            }
          }}
        >
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

            <div>
              <label>ФИО *</label>
              <input placeholder="ФИО *" value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>

            <div className="grid-2">
              <div>
                <label>WhatsApp телефон (Основной) *</label>
                <input placeholder="WhatsApp *" value={whatsappPhone} onChange={e => setWhatsappPhone(e.target.value)} />
              </div>

              <div>
                <label>Дополнительный телефон</label>
                <input
                  placeholder="Введите доп. номер"
                  value={additionalPhone}
                  onChange={e => setAdditionalPhone(e.target.value)}
                />
              </div>
            </div>

            <section>
              <h2>Адреса</h2>

              <div className="grid-2">
                <div>
                  <label>Регистрация — регион / город</label>
                  <input
                    placeholder="Регион / город"
                    value={registrationAddress.region}
                    onChange={e => {
                      const val = e.target.value;
                      setRegistrationAddress(a => ({ ...a, region: val }));
                      if (syncAddress) {
                        setLivingAddress(a => ({ ...a, region: val }));
                      }
                    }}
                  />
                </div>

                <div>
                  <label>Регистрация — улица / дом / кв</label>
                  <input
                    placeholder="Улица / дом / кв"
                    value={registrationAddress.street}
                    onChange={e => {
                      const val = e.target.value;
                      setRegistrationAddress(a => ({ ...a, street: val }));
                      if (syncAddress) {
                        setLivingAddress(a => ({ ...a, street: val }));
                      }
                    }}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div>
                  <label>Проживание — регион / город</label>
                  <input
                    placeholder="Регион / город"
                    value={livingAddress.region}
                    onChange={e => {
                      setLivingAddress(a => ({ ...a, region: e.target.value }));
                      setSyncAddress(false);
                    }}
                  />
                </div>

                <div>
                  <label>Проживание — улица / дом / кв</label>
                  <input
                    placeholder="Улица / дом / кв"
                    value={livingAddress.street}
                    onChange={e => {
                      setLivingAddress(a => ({ ...a, street: e.target.value }));
                      setSyncAddress(false);
                    }}
                  />
                </div>
              </div>

              {/* <div className="mt-4" style={{ marginTop: 16 }}>
                <label>Адрес объекта</label>
                <input
                  placeholder="Адрес объекта"
                  value={objectAddress}
                  onChange={e => setObjectAddress(e.target.value)}
                />
              </div> */}
            </section>

            <div>
              <label>Дата рождения</label>
              <DatePicker
                value={birthDate}
                onChange={setBirthDate}
                placeholder="Выберите дату"
                style={{ width: "100%", display: "block", marginBottom: 14 }}
              />
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
                <DatePicker
                  value={issueDate}
                  onChange={setIssueDate}
                  placeholder="Выберите дату"
                  style={{ width: "100%", display: "block", marginBottom: 14 }}
                />
              </div>
            </div>

            <div>
              <label>ИНН</label>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <input
                  placeholder="ИНН (14 цифр)"
                  value={inn}
                  style={{ flex: 1 }}
                  inputMode="numeric"
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, "");
                    if (val.length <= 14) setInn(val);
                  }}
                />
              </div>
              {inn.length === 14 && (
                <div style={{ marginTop: 10 }}>
                  <PinChecker initialPin={inn} showInput={false} />
                </div>
              )}
            </div>
          </section>

          {/* ---- Тег ---- */}
          <section>
            <div>
              <label>Тег клиента</label>
              <StyledSelect
                options={[
                  { value: "", label: "Не выбран" },
                  ...CLIENT_TAGS.map(tagOption => ({
                    value: tagOption,
                    label: tagOption
                  }))
                ]}
                value={tag}
                onChange={(val) => setTag((val as ClientTag) || "")}
                isSearchable={false}
              />
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

