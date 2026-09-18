import { useEffect, useState } from 'react';

export function useRelatorioForm({ relatorio, submit }) {
  const setInitialFiltros = filtros => {
    if (!filtros) return {};

    const initial = {};
    filtros.forEach(filtro => {
      switch (filtro.htmlFor) {
        case 'dataInicial':
        case 'dataFinal':
          // Literal, nunca calculado aqui: `new Date()` só entra em jogo no
          // useEffect([]) pós-montagem, abaixo.
          initial[filtro.htmlFor] = null;
          break;

        default:
          initial[filtro.htmlFor] = '';
          break;
      }
    });

    return initial;
  };

  const [filtros, setFiltros] = useState(() =>
    setInitialFiltros(relatorio.filters)
  );

  useEffect(() => {
    const hoje = new Date();
    const dataInicioFormatada = hoje.toISOString().split('T')[0];
    const dataFinal = new Date();
    dataFinal.setMonth(dataFinal.getMonth() + 6);
    const dataFinalFormatada = dataFinal.toISOString().split('T')[0];

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFiltros(prev => ({
      ...prev,
      ...(prev.dataInicial === null && { dataInicial: dataInicioFormatada }),
      ...(prev.dataFinal === null && { dataFinal: dataFinalFormatada }),
    }));
  }, []);

  const handleSubmit = () => {
    submit(relatorio.endpoint, filtros);
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return {
    filtros,
    handleChange,
    handleSubmit,
  };
}
