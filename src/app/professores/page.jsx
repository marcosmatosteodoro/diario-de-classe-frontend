'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { useProfessores } from '@/hooks/professores/useProfessores';
import { useDeletarProfessor } from '@/hooks/professores/useDeletarProfessor';
import { useFormater } from '@/hooks/useFormater';
import { Table } from '@/components';

export default function Professores() {
  const { professores, isLoading, isSuccess, isEmpty, columns } =
    useProfessores();
  const { handleDeleteProfessor } = useDeletarProfessor();
  const { telefoneFormatter, dataFormatter } = useFormater();

  const data = useMemo(() => {
    const strokeWidth = 1;
    const size = 16;
    const px = 2;
    return professores.map(prof => ({
      id: prof.id,
      name: prof.nome,
      sobrenome: prof.sobrenome,
      telefone: telefoneFormatter(prof.telefone),
      email: prof.email,
      role: prof.permissao,
      dataCriacao: dataFormatter(prof.dataCriacao),
      acoes: (
        <div className="flex gap-2">
          <Link
            href={`/professores/${prof.id}`}
            className={`px-${px} py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600`}
          >
            <Eye strokeWidth={strokeWidth} size={size} />
          </Link>

          <Link
            href={`/professores/${prof.id}/editar`}
            className={`px-${px} py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600`}
          >
            <Pencil strokeWidth={strokeWidth} size={size} />
          </Link>

          <button
            onClick={() => handleDeleteProfessor(prof.id)}
            className={`px-${px} py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600`}
          >
            <Trash2 strokeWidth={strokeWidth} size={size} />
          </button>
        </div>
      ),
    }));
  }, [professores, telefoneFormatter, dataFormatter, handleDeleteProfessor]);

  return (
    <div className="p-6 mx-auto bg-white shadow rounded-lg">
      <h2 className="text-xl font-bold mb-4">Lista de Professores</h2>

      <div className="pb-3">
        <Link
          href="/professores/novo"
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors cursor-pointer"
        >
          Novo Professor
        </Link>
      </div>

      <Table
        columns={columns}
        data={data}
        isLoading={isLoading}
        notFoundMessage="Nenhum professor encontrado."
      />
    </div>
  );
}
