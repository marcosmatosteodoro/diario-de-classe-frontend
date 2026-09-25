'use client';

import { useEffect } from 'react';
import { notFound } from 'next/navigation';
import { useUserAuth } from '@/providers/UserAuthProvider';
import { useUnsavedChangesGuard } from '@/providers/UnsavedChangesGuardProvider';
import { useConfiguracao } from '@/hooks/configuracoes/useConfiguracao';
import { useConfiguracaoForm } from '@/hooks/configuracoes/useConfiguracaoForm';
import {
  ButtonsFields,
  CheckboxField,
  Form,
  FormError,
  FormGroup,
  InputField,
  Loading,
  PageTitle,
  Section,
  SectionTitle,
} from '@/components';
import { DIAS_ARRAY, DIAS_LABEL } from '@/constants';

const HINT_DURACAO_AULA =
  'Usada apenas para sugerir a hora final de um dia de aula no formulário de contrato quando a quantidade de aulas daquele dia é alterada. Não muda a duração de aulas, dias de aula nem contratos. O novo valor só vale para quem entrar no sistema depois da mudança.';
const HINT_TOLERANCIA =
  'O valor é armazenado, mas ainda não é aplicado automaticamente pelo sistema.';
const HINT_HORARIO_FUNCIONAMENTO =
  'O valor é registrado, mas ainda não restringe o lançamento de aulas.';

export default function Configuracao() {
  const { currentUser, isAdmin } = useUserAuth();
  const { submit, configuracao, isLoading, isSubmitting, message, errors } =
    useConfiguracao();
  const {
    formData,
    isDirty,
    handleChange,
    handleSubmit,
    handleDiasDeFuncionamentoChange,
  } = useConfiguracaoForm({
    submit,
    configuracao,
  });
  const { setGuard, clearGuard } = useUnsavedChangesGuard();

  // Mantém o guard de navegação sempre refletindo o `isDirty` atual — a
  // limpeza (cleanup) roda tanto antes de cada reexecução do efeito quanto no
  // unmount do componente, cobrindo os dois pontos exigidos pelos critérios
  // de pronto com um único efeito.
  useEffect(() => {
    setGuard(() => isDirty);
    return () => clearGuard();
  }, [isDirty, setGuard, clearGuard]);

  if (currentUser && !isAdmin()) {
    return notFound();
  }

  if (isLoading && !configuracao) {
    return <Loading />;
  }

  // Ordem estável dos 7 dias por diaSemana (SEGUNDA → DOMINGO, DIAS_ARRAY): o
  // GET ordena diasDeFuncionamento por diaSemana, mas o PUT não — exibir na
  // ordem do array recebido reintroduziria a ordem instável após salvar.
  const diasDeFuncionamentoOrdenados = DIAS_ARRAY.map(diaSemana =>
    formData.diasDeFuncionamento.find(dia => dia.diaSemana === diaSemana)
  ).filter(Boolean);

  return (
    <>
      <PageTitle>Configurações do sistema</PageTitle>

      <Form handleSubmit={handleSubmit}>
        <FormError title={message} errors={errors} />

        <div className="space-y-6">
          <Section>
            <SectionTitle>Aulas</SectionTitle>
            <FormGroup>
              <InputField
                required
                htmlFor="duracaoAula"
                label="Duração da Aula (minutos)"
                placeholder="Digite a duração da aula em minutos"
                type="number"
                onChange={handleChange}
                value={formData.duracaoAula}
                hint={HINT_DURACAO_AULA}
              />
              <InputField
                required
                htmlFor="tolerancia"
                label="Tolerância de Atraso (minutos)"
                placeholder="Digite a tolerância de atraso em minutos"
                type="number"
                onChange={handleChange}
                value={formData.tolerancia}
                hint={HINT_TOLERANCIA}
              />
            </FormGroup>
          </Section>

          <Section>
            <SectionTitle>Horário de funcionamento</SectionTitle>
            <p className="text-sm text-muted mb-4">
              {HINT_HORARIO_FUNCIONAMENTO}
            </p>
            <FormGroup>
              {diasDeFuncionamentoOrdenados.map(funcionamento => (
                <div key={funcionamento.diaSemana} className="mb-4">
                  <div className="flex gap-5">
                    <h4 className="text-base font-semibold text-main mb-2">
                      {DIAS_LABEL[funcionamento.diaSemana]}
                    </h4>
                    <CheckboxField
                      htmlFor={`${funcionamento.diaSemana}.ativo`}
                      label="Ativo"
                      checked={funcionamento.ativo || false}
                      onChange={handleDiasDeFuncionamentoChange}
                    />
                  </div>
                  <FormGroup cols={1}>
                    <InputField
                      disabled={!funcionamento.ativo}
                      htmlFor={`${funcionamento.diaSemana}.horaInicial`}
                      label="Hora inicial"
                      type="time"
                      onChange={handleDiasDeFuncionamentoChange}
                      value={funcionamento.horaInicial}
                    />

                    <InputField
                      disabled={!funcionamento.ativo}
                      htmlFor={`${funcionamento.diaSemana}.horaFinal`}
                      label="Hora final"
                      type="time"
                      onChange={handleDiasDeFuncionamentoChange}
                      value={funcionamento.horaFinal}
                    />
                  </FormGroup>
                </div>
              ))}
            </FormGroup>
          </Section>
        </div>

        <ButtonsFields isLoading={isSubmitting} href="/configuracoes" />
      </Form>
    </>
  );
}
