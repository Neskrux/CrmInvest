-- EXECUTE ESTE SQL NO SUPABASE AGORA!

-- Aumentar o tamanho do campo valor_fechado para suportar valores maiores
ALTER TABLE fechamentos 
ALTER COLUMN valor_fechado TYPE DECIMAL(15,2);

-- Isso permite valores até 9.999.999.999.999,99 