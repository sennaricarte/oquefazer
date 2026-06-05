/**
 * Cruza profissões de alta demanda com o índice do blog.
 * Uso: node scripts/gap-analysis.mjs
 */
import { analyzeTopic } from './check-topic.mjs';
import { buildPostIndex } from './lib/post-index.mjs';

/** Profissões evergreen (alto volume "o que faz" no Google BR) + LinkedIn 2026 */
const HIGH_DEMAND = [
	// Saúde — volume clássico
	{ name: 'Fisioterapeuta', query: 'fisioterapeuta', cluster: 'saude', demand: 'evergreen' },
	{ name: 'Psicólogo', query: 'psicólogo', cluster: 'saude', demand: 'evergreen' },
	{ name: 'Dentista', query: 'dentista', cluster: 'saude', demand: 'evergreen' },
	{ name: 'Farmacêutico', query: 'farmacêutico', cluster: 'saude', demand: 'evergreen' },
	{ name: 'Biomédico', query: 'biomédico', cluster: 'saude', demand: 'evergreen' },
	{ name: 'Fonoaudiólogo', query: 'fonoaudiólogo', cluster: 'saude', demand: 'evergreen' },
	{ name: 'Nutricionista', query: 'nutricionista', cluster: 'saude', demand: 'evergreen' },
	{ name: 'Veterinário', query: 'veterinário', cluster: 'saude', demand: 'evergreen' },
	{ name: 'Técnico de Enfermagem', query: 'técnico de enfermagem', cluster: 'saude', demand: 'linkedin-2026' },
	{ name: 'Auxiliar de Enfermagem', query: 'auxiliar de enfermagem', cluster: 'saude', demand: 'evergreen' },
	{ name: 'Técnico em Radiologia', query: 'técnico em radiologia', cluster: 'saude', demand: 'evergreen' },
	{ name: 'Técnico em Microbiologia', query: 'técnico em microbiologia', cluster: 'saude', demand: 'linkedin-2026' },
	{ name: 'Assistente de Pesquisa Clínica', query: 'assistente de pesquisa clínica', cluster: 'saude', demand: 'linkedin-2026' },

	// Educação
	{ name: 'Pedagogo', query: 'pedagogo', cluster: 'educacao', demand: 'evergreen' },
	{ name: 'Professor de Educação Física', query: 'professor de educação física', cluster: 'educacao', demand: 'evergreen' },
	{ name: 'Coordenador Pedagógico', query: 'coordenador pedagógico', cluster: 'educacao', demand: 'evergreen' },

	// Direito / finanças
	{ name: 'Contador', query: 'contador', cluster: 'financas', demand: 'evergreen' },
	{ name: 'Administrador', query: 'administrador', cluster: 'gestao', demand: 'evergreen' },
	{ name: 'Economista', query: 'economista', cluster: 'financas', demand: 'evergreen' },
	{ name: 'Planejador Financeiro', query: 'planejador financeiro', cluster: 'financas', demand: 'linkedin-2026' },
	{ name: 'Consultor de Investimentos', query: 'consultor de investimentos', cluster: 'financas', demand: 'linkedin-2026' },
	{ name: 'Analista de Orçamento', query: 'analista de orçamento', cluster: 'financas', demand: 'linkedin-2026' },
	{ name: 'Analista de Auditoria', query: 'analista de auditoria', cluster: 'financas', demand: 'linkedin-2026' },
	{ name: 'Corretor de Imóveis', query: 'corretor de imóveis', cluster: 'financas', demand: 'evergreen' },
	{ name: 'Corretor de Seguros', query: 'corretor de seguros', cluster: 'financas', demand: 'evergreen' },

	// Tecnologia — volume clássico
	{ name: 'Programador', query: 'programador', cluster: 'tecnologia', demand: 'evergreen' },
	{ name: 'Analista de Suporte', query: 'analista de suporte', cluster: 'tecnologia', demand: 'evergreen' },
	{ name: 'DevOps', query: 'devops', cluster: 'tecnologia', demand: 'evergreen' },
	{ name: 'Product Manager', query: 'product manager', cluster: 'tecnologia', demand: 'evergreen' },
	{ name: 'Scrum Master', query: 'scrum master', cluster: 'tecnologia', demand: 'evergreen' },
	{ name: 'Assistente de Dados', query: 'assistente de dados', cluster: 'tecnologia', demand: 'linkedin-2026' },
	{ name: 'Engenheiro de IA', query: 'engenheiro de inteligência artificial', cluster: 'tecnologia', demand: 'linkedin-2026' },

	// Engenharia clássica
	{ name: 'Engenheiro Elétrico', query: 'engenheiro elétrico', cluster: 'engenharia', demand: 'evergreen' },
	{ name: 'Engenheiro Mecânico', query: 'engenheiro mecânico', cluster: 'engenharia', demand: 'evergreen' },
	{ name: 'Engenheiro Ambiental', query: 'engenheiro ambiental', cluster: 'engenharia', demand: 'evergreen' },
	{ name: 'Engenheiro de Segurança do Trabalho', query: 'engenheiro de segurança do trabalho', cluster: 'engenharia', demand: 'evergreen' },
	{ name: 'Engenheiro de Segurança de Processo', query: 'engenheiro de segurança de processo', cluster: 'engenharia', demand: 'linkedin-2026' },
	{ name: 'Engenheiro de Confiabilidade', query: 'engenheiro de confiabilidade', cluster: 'engenharia', demand: 'linkedin-2026' },
	{ name: 'Geofísico', query: 'geofísico', cluster: 'engenharia', demand: 'linkedin-2026' },

	// Construção / serviços
	{ name: 'Eletricista', query: 'eletricista', cluster: 'construcao-civil', demand: 'evergreen' },
	{ name: 'Serralheiro', query: 'serralheiro', cluster: 'construcao-civil', demand: 'evergreen' },
	{ name: 'Vidraceiro', query: 'vidraceiro', cluster: 'construcao-civil', demand: 'evergreen' },
	{ name: 'Azulejista', query: 'azulejista', cluster: 'construcao-civil', demand: 'evergreen' },
	{ name: 'Marceneiro', query: 'marceneiro', cluster: 'construcao-civil', demand: 'evergreen' },

	// Beleza / alimentação / serviços
	{ name: 'Cabeleireiro', query: 'cabeleireiro', cluster: 'servicos', demand: 'evergreen' },
	{ name: 'Barbeiro', query: 'barbeiro', cluster: 'servicos', demand: 'evergreen' },
	{ name: 'Esteticista', query: 'esteticista', cluster: 'servicos', demand: 'evergreen' },
	{ name: 'Manicure', query: 'manicure', cluster: 'servicos', demand: 'evergreen' },
	{ name: 'Chef de Cozinha', query: 'chef de cozinha', cluster: 'servicos', demand: 'evergreen' },
	{ name: 'Cozinheiro', query: 'cozinheiro', cluster: 'servicos', demand: 'evergreen' },
	{ name: 'Garçom', query: 'garçom', cluster: 'servicos', demand: 'evergreen' },
	{ name: 'Personal Trainer', query: 'personal trainer', cluster: 'servicos', demand: 'evergreen' },

	// Segurança / transporte
	{ name: 'Bombeiro', query: 'bombeiro', cluster: 'seguranca', demand: 'evergreen' },
	{ name: 'Policial', query: 'policial', cluster: 'seguranca', demand: 'evergreen' },
	{ name: 'Motorista de Aplicativo', query: 'motorista de aplicativo', cluster: 'servicos', demand: 'evergreen' },
	{ name: 'Entregador', query: 'entregador', cluster: 'servicos', demand: 'evergreen' },
	{ name: 'Piloto de Avião', query: 'piloto de avião', cluster: 'transporte', demand: 'evergreen' },
	{ name: 'Comissário de Bordo', query: 'comissário de bordo', cluster: 'transporte', demand: 'evergreen' },

	// Comunicação / criativo
	{ name: 'Fotógrafo', query: 'fotógrafo', cluster: 'comunicacao', demand: 'evergreen' },
	{ name: 'Influenciador Digital', query: 'influenciador digital', cluster: 'comunicacao', demand: 'evergreen' },
	{ name: 'Youtuber', query: 'youtuber', cluster: 'comunicacao', demand: 'evergreen' },

	// RH / gestão
	{ name: 'Analista de RH', query: 'analista de rh', cluster: 'gestao', demand: 'evergreen' },
	{ name: 'Recrutador', query: 'recrutador', cluster: 'gestao', demand: 'linkedin-2026' },
	{ name: 'Gerente de RH', query: 'gerente de rh', cluster: 'gestao', demand: 'evergreen' },
	{ name: 'Assistente Administrativo', query: 'assistente administrativo', cluster: 'gestao', demand: 'evergreen' },
	{ name: 'Secretário', query: 'secretário', cluster: 'gestao', demand: 'evergreen' },
	{ name: 'Recepcionista', query: 'recepcionista', cluster: 'gestao', demand: 'evergreen' },
	{ name: 'Gerente de Planejamento Estratégico', query: 'gerente de planejamento estratégico', cluster: 'gestao', demand: 'linkedin-2026' },
	{ name: 'Gerente de Sucesso do Cliente', query: 'gerente de sucesso do cliente', cluster: 'gestao', demand: 'linkedin-2026' },
	{ name: 'Consultor de Logística', query: 'consultor de logística', cluster: 'gestao', demand: 'linkedin-2026' },
	{ name: 'Analista de Logística', query: 'analista de logística', cluster: 'gestao', demand: 'evergreen' },

	// Agro / ciências
	{ name: 'Agrônomo', query: 'agrônomo', cluster: 'agro', demand: 'evergreen' },
	{ name: 'Cientista Agrário', query: 'cientista agrário', cluster: 'agro', demand: 'linkedin-2026' },
	{ name: 'Zootecnista', query: 'zootecnista', cluster: 'agro', demand: 'evergreen' },
	{ name: 'Geólogo', query: 'geólogo', cluster: 'ciencias', demand: 'evergreen' },

	// Social / outros
	{ name: 'Assistente Social', query: 'assistente social', cluster: 'social', demand: 'evergreen' },
	{ name: 'Bibliotecário', query: 'bibliotecário', cluster: 'educacao', demand: 'evergreen' },
	{ name: 'Consultor Regulatório', query: 'consultor regulatório', cluster: 'direito', demand: 'linkedin-2026' },
	{ name: 'Analista de Energia', query: 'analista de energia', cluster: 'engenharia', demand: 'linkedin-2026' },
	{ name: 'Especialista em Manufatura', query: 'especialista em manufatura', cluster: 'engenharia', demand: 'linkedin-2026' },
];

const posts = buildPostIndex().filter((p) => !p.draft);

const gaps = [];
const partial = [];
const covered = [];

for (const item of HIGH_DEMAND) {
	const result = analyzeTopic(item.query, posts);

	if (result.blocked) {
		covered.push({ ...item, url: result.exact[0]?.url ?? result.similar[0]?.url, note: 'coberto' });
	} else if (result.similar.length > 0) {
		partial.push({
			...item,
			similar: result.similar.slice(0, 2).map((s) => ({ slug: s.slug, title: s.title })),
		});
	} else {
		gaps.push(item);
	}
}

const byCluster = (list) => {
	const map = new Map();
	for (const item of list) {
		if (!map.has(item.cluster)) map.set(item.cluster, []);
		map.get(item.cluster).push(item);
	}
	return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
};

console.log(JSON.stringify({
	totalChecked: HIGH_DEMAND.length,
	covered: covered.length,
	partial: partial.length,
	gaps: gaps.length,
	gapList: gaps,
	partialList: partial,
}, null, 2));
