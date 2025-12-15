'use client';

import { useContratoForm } from '@/providers/ContratoFormProvider';
import { useAlunos } from '@/hooks/alunos/useAlunos';
import { SelectField } from '@/components';

export default function ContratoStep1() {
  const { setAluno, formData, handleChange } = useContratoForm();
  const { alunos } = useAlunos();
  const options =
    alunos && alunos.length > 0
      ? alunos.map(aluno => ({
          label: `${aluno.nome} ${aluno.sobrenome} <${aluno.email}>`,
          value: aluno.id,
        }))
      : [];
  const handleStep1Change = e => {
    const { value } = e.target;
    handleChange(e);
    setAluno(
      alunos.find(aluno => aluno.id.toString() === value.toString()) || null
    );
  };
  return (
    <SelectField
      required
      htmlFor="alunoId"
      label="Aluno"
      placeholder="Selecione o aluno"
      onChange={handleStep1Change}
      value={formData.alunoId}
      options={options}
    />
  );
}
