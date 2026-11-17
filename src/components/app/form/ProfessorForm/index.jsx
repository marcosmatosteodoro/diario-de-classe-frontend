import { useEffect, useRef } from 'react';
import { PERMISSAO, IDIOMA_ARRAY, IDIOMA_LABEL } from '@/constants';
import {
  ButtonsFields,
  Form,
  FormError,
  FormGroup,
  FormSection,
  InputField,
  PasswordField,
  SelectField,
} from '@/components';
import { useUserAuth } from '@/providers/UserAuthProvider';

export const ProfessorForm = ({
  handleSubmit,
  message,
  isSenhaError,
  errors,
  handleChange,
  formData,
  isLoading,
  isEdit = false,
  alterarSenhaAtivo = false,
  handleAlterarSenha,
  handleCancelarAlteracaoSenha,
}) => {
  const { currentUser, isAdmin } = useUserAuth();

  // disponibilidade do botão "Alterar senha" (FR-001-010, DEC-002-003):
  // administrador editando qualquer professor, ou o próprio professor
  // editando seu perfil. `currentUser?.id != null` nega quando o usuário
  // logado ainda não resolveu — `undefined === undefined` liberaria o botão
  // indevidamente com a comparação simples.
  const podeAlterarSenha =
    isEdit &&
    (isAdmin() || (currentUser?.id != null && formData.id === currentUser.id));
  const mostrarSecaoSeguranca = !isEdit || podeAlterarSenha;
  const mostrarCamposSenha = !isEdit || (podeAlterarSenha && alterarSenhaAtivo);
  const mostrarBotaoAlterarSenha = podeAlterarSenha && !alterarSenhaAtivo;
  const mostrarBotaoCancelarSenha = podeAlterarSenha && alterarSenhaAtivo;

  const senhaFieldRef = useRef(null);
  const alterarSenhaButtonRef = useRef(null);
  const alterarSenhaAtivoAnteriorRef = useRef(alterarSenhaAtivo);

  // Foco segue a revelação/ocultação dos campos de senha (NFR-001-002): ao
  // acionar "Alterar senha", vai ao campo Senha; ao cancelar, volta ao botão
  // "Alterar senha". A montagem inicial (criação ou edição) não move foco.
  useEffect(() => {
    if (alterarSenhaAtivoAnteriorRef.current === alterarSenhaAtivo) {
      return;
    }
    alterarSenhaAtivoAnteriorRef.current = alterarSenhaAtivo;
    if (alterarSenhaAtivo) {
      senhaFieldRef.current?.focus();
    } else {
      alterarSenhaButtonRef.current?.focus();
    }
  }, [alterarSenhaAtivo]);

  return (
    <Form
      handleSubmit={handleSubmit}
      props={{ 'data-testid': 'professor-form' }}
    >
      <FormError
        title={message || (isSenhaError ? 'As senhas não coincidem' : '')}
        errors={errors}
        dataTestId="professor-form-error"
      />

      <div className="grid gap-6">
        <FormSection title="Informações pessoais">
          <FormGroup dataTestId="professor-form-group-informacoes">
            {/* Nome */}
            <InputField
              required
              htmlFor="nome"
              label="Nome"
              placeholder="Digite o nome"
              maxLength={200}
              minLength={3}
              onChange={handleChange}
              value={formData.nome}
            />

            {/* Sobrenome */}
            <InputField
              required
              htmlFor="sobrenome"
              label="Sobrenome"
              placeholder="Digite o sobrenome"
              maxLength={200}
              minLength={3}
              onChange={handleChange}
              value={formData.sobrenome}
            />

            {/* Email */}
            <InputField
              required
              htmlFor="email"
              label="Email"
              placeholder="Digite o email"
              maxLength={200}
              minLength={3}
              onChange={handleChange}
              value={formData.email}
            />

            {/* Telefone */}
            <InputField
              htmlFor="telefone"
              label="Telefone"
              placeholder="(11) 99999-9999"
              maxLength={11}
              onChange={handleChange}
              value={formData.telefone}
            />
          </FormGroup>
        </FormSection>

        <FormSection title="Acesso">
          <FormGroup dataTestId="professor-form-group-acesso">
            {/* Permissão */}
            <SelectField
              required
              htmlFor="permissao"
              label="Permissão"
              onChange={handleChange}
              value={formData.permissao}
              options={[
                { value: PERMISSAO.MEMBER, label: 'Professor' },
                { value: PERMISSAO.ADMIN, label: 'Administrador' },
              ]}
            />

            <SelectField
              required
              htmlFor="idioma"
              label="Idioma"
              onChange={handleChange}
              value={formData.idioma}
              options={IDIOMA_ARRAY.map(idioma => ({
                value: idioma,
                label: IDIOMA_LABEL[idioma],
              }))}
            />
          </FormGroup>
        </FormSection>

        {mostrarSecaoSeguranca && (
          <FormSection title="Segurança">
            {mostrarBotaoAlterarSenha && (
              <button
                ref={alterarSenhaButtonRef}
                type="button"
                className="btn-outline btn-outline-secondary tap-target"
                onClick={handleAlterarSenha}
              >
                Alterar senha
              </button>
            )}

            {mostrarCamposSenha && (
              <>
                <FormGroup dataTestId="professor-form-group-seguranca">
                  {/* Senha */}
                  <PasswordField
                    ref={senhaFieldRef}
                    required
                    htmlFor="senha"
                    label="Senha"
                    placeholder="Digite a senha"
                    minLength={6}
                    maxLength={100}
                    onChange={handleChange}
                    value={formData.senha}
                    autoComplete="new-password"
                  />
                  {/* Repetir Senha */}
                  <PasswordField
                    required
                    htmlFor="repetirSenha"
                    label="Repetir Senha"
                    placeholder="Confirme a senha"
                    minLength={6}
                    maxLength={100}
                    onChange={handleChange}
                    value={formData.repetirSenha}
                    autoComplete="new-password"
                    error={isSenhaError ? 'As senhas não coincidem' : undefined}
                  />
                </FormGroup>

                {mostrarBotaoCancelarSenha && (
                  <button
                    type="button"
                    className="btn-outline btn-outline-secondary tap-target mt-3"
                    onClick={handleCancelarAlteracaoSenha}
                  >
                    Cancelar alteração de senha
                  </button>
                )}
              </>
            )}
          </FormSection>
        )}
      </div>

      {/* Botões */}
      <ButtonsFields isLoading={isLoading} href="/professores" />
    </Form>
  );
};
