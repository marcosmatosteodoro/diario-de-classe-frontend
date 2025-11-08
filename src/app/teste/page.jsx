'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  getProfessores,
  createProfessor,
  deleteProfessor,
} from '../../store/slices/professoresSlice';

export default function ProfessoresPage() {
  const dispatch = useDispatch();
  const { list, loading } = useSelector(state => state.professores);
  const [nome, setNome] = useState('');

  useEffect(() => {
    dispatch(getProfessores());
  }, [dispatch]);

  const handleCreate = () => {
    dispatch(createProfessor({ nome }));
    setNome('');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Professores</h1>

      <input
        placeholder="Nome do professor"
        value={nome}
        onChange={e => setNome(e.target.value)}
      />
      <button onClick={handleCreate}>Adicionar</button>

      {loading && <p>Carregando...</p>}

      <ul>
        {list.map(p => (
          <li key={p.id}>
            {p.nome}{' '}
            <button onClick={() => dispatch(deleteProfessor(p.id))}>
              Apagar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
