'use client';

import { HealthCheck } from '@/components/HealthCheck';
import { useToast } from '@/providers/ToastProvider';

export default function Home() {
  const { success, error, warning, info } = useToast();
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-800 mb-8">
          Bem-vindo ao Diário de Classe
        </h2>

        {/* Health Check da API */}
        <div className="mb-8">
          <HealthCheck />
        </div>

        {/* Toast Demo */}
        <div className="mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Demonstração de Toasts
            </h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => success('Operação realizada com sucesso!')}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Success Toast
              </button>

              <button
                onClick={() => error('Erro ao processar solicitação!')}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Error Toast
              </button>

              <button
                onClick={() => warning('Atenção: Verifique os dados!')}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
              >
                Warning Toast
              </button>

              <button
                onClick={() => info('Informação importante!')}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Info Toast
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Total de Alunos
            </h3>
            <p className="text-3xl font-bold text-blue-600">142</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Turmas Ativas
            </h3>
            <p className="text-3xl font-bold text-green-600">8</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Disciplinas
            </h3>
            <p className="text-3xl font-bold text-purple-600">12</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Atividades Recentes
          </h3>
          <div className="space-y-4">
            <div className="flex items-center p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-blue-600 font-semibold">MG</span>
              </div>
              <div>
                <p className="font-medium text-gray-800">
                  Maria Silva adicionou uma nova nota
                </p>
                <p className="text-sm text-gray-500">Há 2 horas</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-green-600 font-semibold">JS</span>
              </div>
              <div>
                <p className="font-medium text-gray-800">
                  João Santos marcou presença na turma A
                </p>
                <p className="text-sm text-gray-500">Há 4 horas</p>
              </div>
            </div>

            <div className="flex items-center p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-purple-600 font-semibold">AP</span>
              </div>
              <div>
                <p className="font-medium text-gray-800">
                  Ana Paula criou nova avaliação
                </p>
                <p className="text-sm text-gray-500">Ontem</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
