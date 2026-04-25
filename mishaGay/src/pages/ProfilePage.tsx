import { FC, useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { profileAPI, UserProfile } from "../api/profile";
import { ErrorMessage } from "../components/ErrorMessage";


export const ProfilePage: FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await profileAPI.getMe();
      setProfile(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ошибка загрузки профиля");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="dashboard-page">
        <div className="dashboard-header">
          <h1>Мой профиль</h1>
        </div>

        <ErrorMessage error={error} onClose={() => setError(null)} />

        {loading ? (
          <div>Загрузка профиля...</div>
        ) : profile ? (
          <div className="dashboard-grid" style={{ gridTemplateColumns: "1fr" }}>
            <div className="dashboard-card dashboard-card-blue" style={{ textAlign: "left", display: "block" }}>
              <h2 style={{ marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: "10px" }}>Личные данные</h2>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                <div>
                  <strong>ФИО:</strong>
                  <p>{profile.fullName || "Не указан"}</p>
                </div>
                <div>
                  <strong>Email:</strong>
                  <p>{profile.email || "Не указан"}</p>
                </div>
                <div>
                  <strong>Телефон:</strong>
                  <p>{profile.phone || "Не указан"}</p>
                </div>
                <div>
                  <strong>Дата рождения:</strong>
                  <p>{profile.birthDate || "Не указана"}</p>
                </div>
                <div>
                  <strong>Фактический адрес проживания:</strong>
                  <p>{profile.residentialAddress || "Не указан"}</p>
                </div>
                <div>
                  <strong>Адрес регистрации:</strong>
                  <p>{profile.registeredAddress || "Не указан"}</p>
                </div>
              </div>

              <h2 style={{ marginTop: "30px", marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: "10px" }}>Настройки и согласия</h2>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>
                <div>
                  <span style={{ marginRight: "10px" }}>{profile.consentPersonalData ? "✅" : "❌"}</span>
                  <strong>Согласие на обработку персональных данных</strong>
                </div>
                <div>
                  <span style={{ marginRight: "10px" }}>{profile.consentPrivacyPolicy ? "✅" : "❌"}</span>
                  <strong>Согласие с политикой конфиденциальности</strong>
                </div>
                <div>
                  <span style={{ marginRight: "10px" }}>{profile.consentUserAgreement ? "✅" : "❌"}</span>
                  <strong>Пользовательское соглашение</strong>
                </div>
                <div>
                  <span style={{ marginRight: "10px" }}>{profile.simpleMode ? "✅" : "❌"}</span>
                  <strong>Упрощенный режим интерфейса</strong>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>Не удалось загрузить профиль</div>
        )}
      </div>
    </Layout>
  );
};
