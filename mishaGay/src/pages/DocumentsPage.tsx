import { FC, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { DocumentCard } from "../components/DocumentCard";
import { documentsAPI } from "../api/documents";
import { Document } from "../types/document.types";
import { ErrorMessage } from "../components/ErrorMessage";

export const DocumentsPage: FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await documentsAPI.getAll();
      setDocuments(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ошибка загрузки договоров");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentClick = (id: number) => {
    navigate(`/documents/${id}`);
  };

  if (loading) {
    return (
      <Layout>
        <div>Загрузка...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1>Договоры</h1>
      <ErrorMessage error={error} onClose={() => setError(null)} />
      
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", 
        gap: "20px",
        marginTop: "20px"
      }}>
        {documents.map(document => (
          <DocumentCard 
            key={document.id} 
            document={document} 
            onClick={handleDocumentClick}
          />
        ))}
      </div>
      
      {documents.length === 0 && !loading && (
        <p>Договоры не найдены</p>
      )}
    </Layout>
  );
};

