import { FC, useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { ContractsTable } from "../components/ContractsTable";
import { getContracts } from "../api/excel.api";
import { ContractDto } from "../types/Contract";
import { ErrorMessage } from "../components/ErrorMessage";

export const DocumentsPage: FC = () => {
  const [contracts, setContracts] = useState<ContractDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getContracts();
      setContracts(data);
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
      
      {contracts.length === 0 && !loading ? (
        <p>Договоры не найдены</p>
      ) : (
        <ContractsTable contracts={contracts} />
      )}
    </Layout>
  );
};

