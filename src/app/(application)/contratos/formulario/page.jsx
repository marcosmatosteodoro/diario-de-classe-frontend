'use client';

import Link from 'next/link';
import {
  ButtonGroup,
  Container,
  PageContent,
  PageSubTitle,
  PageTitle,
} from '@/components';

export default function NovoAluno() {
  return (
    <Container>
      <PageContent>
        <PageTitle>Novo Contrato</PageTitle>

        <PageSubTitle>Preencha os dados para criar um novo aluno</PageSubTitle>
      </PageContent>

      <ButtonGroup>
        <Link href="/contratos" className="btn btn-secondary">
          ← Voltar
        </Link>
      </ButtonGroup>
    </Container>
  );
}
