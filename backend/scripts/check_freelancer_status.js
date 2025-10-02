const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFreelancerStatus() {
  try {
    console.log('🔍 Verificando status de freelancers...\n');

    // Buscar todos os consultores
    const { data: consultores, error } = await supabase
      .from('consultores')
      .select('id, nome, email, is_freelancer, codigo_referencia, tipo, ativo')
      .eq('ativo', true)
      .order('nome');

    if (error) throw error;

    console.log(`📊 Total de consultores ativos: ${consultores.length}\n`);

    // Separar freelancers
    const freelancers = consultores.filter(c => c.is_freelancer === true);
    const naoFreelancers = consultores.filter(c => c.is_freelancer !== true);

    console.log('✅ FREELANCERS:');
    console.log('─'.repeat(80));
    if (freelancers.length > 0) {
      freelancers.forEach(c => {
        console.log(`👤 ${c.nome}`);
        console.log(`   Email: ${c.email}`);
        console.log(`   Código Ref: ${c.codigo_referencia || 'NÃO TEM'}`);
        console.log(`   ID: ${c.id}`);
        console.log('');
      });
    } else {
      console.log('   Nenhum freelancer encontrado!\n');
    }

    console.log('\n❌ NÃO-FREELANCERS:');
    console.log('─'.repeat(80));
    if (naoFreelancers.length > 0) {
      naoFreelancers.forEach(c => {
        console.log(`👤 ${c.nome}`);
        console.log(`   Email: ${c.email}`);
        console.log(`   is_freelancer: ${c.is_freelancer}`);
        console.log(`   Código Ref: ${c.codigo_referencia || 'NÃO TEM'}`);
        console.log('');
      });
    }

    // Verificar tabela consultor_clinica
    console.log('\n🔗 Verificando relacionamentos consultor-clínica...\n');
    const { data: relacoes, error: relError } = await supabase
      .from('consultor_clinica')
      .select(`
        id,
        consultor_id,
        clinica_id,
        data_indicacao,
        consultores(nome, email),
        clinicas(nome, telefone)
      `);

    if (relError) {
      console.error('❌ Erro ao buscar relacionamentos:', relError.message);
    } else if (relacoes && relacoes.length > 0) {
      console.log(`📋 Total de relacionamentos: ${relacoes.length}\n`);
      relacoes.forEach(r => {
        console.log(`🔗 Relacionamento ID: ${r.id}`);
        console.log(`   Consultor: ${r.consultores?.nome} (${r.consultores?.email})`);
        console.log(`   Clínica: ${r.clinicas?.nome}`);
        console.log(`   Data: ${new Date(r.data_indicacao).toLocaleString('pt-BR')}`);
        console.log('');
      });
    } else {
      console.log('⚠️ Nenhum relacionamento encontrado ainda.\n');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

checkFreelancerStatus();

