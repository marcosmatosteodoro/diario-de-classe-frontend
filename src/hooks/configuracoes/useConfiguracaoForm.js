import { useEffect, useMemo, useState } from 'react';

const CAMPOS_DIA_COMPARADOS = ['ativo', 'horaInicial', 'horaFinal'];

/**
 * Compara os dias de funcionamento por `diaSemana` — nunca por índice. O GET ordena
 * `diasDeFuncionamento` por `diaSemana`, mas o PUT não (DEC/PLAN-002, COMP-002-004);
 * comparar por índice casaria dias diferentes entre si quando a ordem muda.
 */
function diasDeFuncionamentoIguais(diasAtual, diasReferencia) {
  if (diasAtual.length !== diasReferencia.length) return false;

  const referenciaPorDia = new Map(
    diasReferencia.map(dia => [dia.diaSemana, dia])
  );

  return diasAtual.every(diaAtual => {
    const diaReferencia = referenciaPorDia.get(diaAtual.diaSemana);
    if (!diaReferencia) return false;
    return CAMPOS_DIA_COMPARADOS.every(
      campo => diaAtual[campo] === diaReferencia[campo]
    );
  });
}

function formDataIgualUltimaLeitura(formData, ultimaLeitura) {
  if (!ultimaLeitura) return true;
  return (
    formData.duracaoAula === ultimaLeitura.duracaoAula &&
    formData.tolerancia === ultimaLeitura.tolerancia &&
    diasDeFuncionamentoIguais(
      formData.diasDeFuncionamento,
      ultimaLeitura.diasDeFuncionamento
    )
  );
}

export function useConfiguracaoForm({ submit, configuracao = null }) {
  const [formData, setFormData] = useState({
    id: '',
    duracaoAula: '',
    tolerancia: '',
    diasDeFuncionamento: [],
    confirmacao: false,
  });
  const [ultimaLeitura, setUltimaLeitura] = useState(null);

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDiasDeFuncionamentoChange = e => {
    const { name, value, checked } = e.target;
    const [diaSemana, campo] = name.split('.');
    const diaDeFuncionamento = formData.diasDeFuncionamento.find(
      dia => dia.diaSemana === diaSemana
    );

    if (!diaDeFuncionamento) return;

    setFormData(prev => ({
      ...prev,
      diasDeFuncionamento: prev.diasDeFuncionamento.map(dia =>
        dia.diaSemana === diaSemana
          ? {
              ...diaDeFuncionamento,
              [campo]: campo === 'ativo' ? checked : value,
            }
          : dia
      ),
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const dataToSend = formData;
    submit(dataToSend);
  };

  const restaurarUltimaLeitura = () => {
    if (!ultimaLeitura) return;
    setFormData({ ...ultimaLeitura, confirmacao: false });
  };

  useEffect(() => {
    if (configuracao) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({ ...configuracao, confirmacao: false });
      setUltimaLeitura(configuracao);
    }
  }, [configuracao]);

  const isDirty = useMemo(
    () => !formDataIgualUltimaLeitura(formData, ultimaLeitura),
    [formData, ultimaLeitura]
  );

  return {
    formData,
    isDirty,
    restaurarUltimaLeitura,
    handleSubmit,
    handleChange,
    handleDiasDeFuncionamentoChange,
    setFormData,
  };
}
