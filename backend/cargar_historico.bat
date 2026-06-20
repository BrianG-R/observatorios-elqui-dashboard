@echo off

echo ==========================
echo Cargando Enero
python etl.py 2026-01-01 2026-01-31

echo ==========================
echo Cargando Febrero
python etl.py 2026-02-01 2026-02-28

echo ==========================
echo Cargando Marzo
python etl.py 2026-03-01 2026-03-31

echo ==========================
echo Cargando Abril
python etl.py 2026-04-01 2026-04-30

echo ==========================
echo Cargando Mayo
python etl.py 2026-05-01 2026-05-31

echo ==========================
echo Cargando Junio
python etl.py 2026-06-01 2026-06-20

echo ==========================
echo PROCESO TERMINADO
pause