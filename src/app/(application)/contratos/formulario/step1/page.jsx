'use client';

import { useContratoForm } from '@/providers/ContratoFormProvider';
import { useAlunos } from '@/hooks/alunos/useAlunos';
import { SelectField, FormGroup } from '@/components';
import { useProfessores } from '@/hooks/professores/useProfessores';

export default function ContratoStep1() {
  const { setAluno, formData, handleChange } = useContratoForm();
  const { alunos } = useAlunos();
  const { professores } = useProfessores();
  const makeLabel = ({ nome, sobrenome, email }) => {
    return `${nome} ${sobrenome} <${email}>`;
  };

  // TODO não mostrar alunos com contratos ativos
  const alunoOptions =
    alunos && alunos.length > 0
      ? alunos.map(aluno => ({
          label: makeLabel(aluno),
          value: aluno.id,
        }))
      : [];
  const professorOptions =
    professores && professores.length > 0
      ? professores.map(professor => ({
          label: makeLabel(professor),
          value: professor.id,
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
    <FormGroup col={2}>
      <SelectField
        required
        htmlFor="alunoId"
        label="Aluno"
        placeholder="Selecione o aluno"
        onChange={handleStep1Change}
        value={formData.alunoId}
        options={alunoOptions}
      />
      <SelectField
        required
        htmlFor="professorId"
        label="Professor"
        placeholder="Selecione o professor"
        onChange={handleChange}
        value={formData.professorId}
        options={professorOptions}
      />
    </FormGroup>
  );
}
