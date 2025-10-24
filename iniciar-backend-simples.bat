@echo off
echo Iniciando backend...
cd /d "C:\Users\bruno\OneDrive\Área de Trabalho\InvestMoneyBots\CrmInvest\backend"
echo Diretorio atual: %CD%
echo Instalando dependencias...
npm install
echo Iniciando servidor...
node server.js
pause

