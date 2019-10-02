const puppeteer = require('puppeteer');
const cors = require('cors');
const express = require('express');
const app = express();
const pg = require('pg');
const bodyParser = require('body-parser');
const pool = new pg.Pool({
user: 'modulo4',
host: '67.205.143.180',
database: 'tcs2',
password: 'modulo4',
port: '5432'});

const corsList=['https://tcs-nuevo-mantenimiento.herokuapp.com','http://localhost:3000'];
const corsOptions={
    origin:(origin,callback)=>
    {
        if(corsList.indexOf(origin)!==-1)
        {
            callback(null,true);
        }
        else{
            callback(new Error('Choteado gaaaaaaaa'));
        }
    }
}


/*Middlewares */
app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: false }))
 
// parse application/json
app.use(bodyParser.json())
 
app.post('/insertarEquivalente',async(req,res)=>
{
    console.log(req.body);

    const {fechaEquivalente} = req.body;
    const {fecha} = req.body;

    console.log(fechaEquivalente);
    console.log(fecha);

    const resultados = await pool.query('select insertarFechaEquivalente($1,$2)',[fecha,fechaEquivalente]);
    console.log(resultados.rows[0].resultado);

    if(resultados.rows[0].resultado==1)
    {
        return res.status(200).send({message:'OK'});
    }else
    {
        return res.status(206).send({message:'ERROR'});
    }
});
app.post('/insertarTipoCambio',async(req,res)=>
{

    console.log(req.body);
    console.log(req.body.fecha);
    console.log(req.body.compra);
    console.log(req.body.venta);
    
    const {fecha} = req.body;
    const {compra} = req.body;
    const {venta}  = req.body;

    console.log('Fecha: '+fecha);
    console.log('Compra: '+compra);
    console.log('Venta: '+venta);
    
    const resultado = await pool.query('select insertar_fecha_con_tipo_cambio($1,$2,$3)',[fecha,compra,venta]);
    
    console.log('RESULTADO:  ' +resultado.rows[0].insertar_fecha_con_tipo_cambio);

    if(resultado.rows[0].insertar_fecha_con_tipo_cambio==1)
        return res.status(200).send({status:'OK'});
    else{
        return res.status(205).send({status:'FAILED'});
    }
});
app.put('/actualizarFecha/:fecha',async(req,res)=>
{
    const {fecha}  = req.params;
    const {compra} = req.body;
    const {venta} = req.body;

    console.log(fecha);
    const resultado = await pool.query('select update_tipocambio($1,$2,$3)',[compra,venta,fecha]);

    console.log('EL RESULTADO :: '+resultado.rows[0].update_tipocambio);
    if(resultado.rows[0].update_tipocambio==1){
        return res.status(200).send({status:'ACTUALIZADO'});
    }
    return res.status(205).send({status:'FAILED'});

});
app.get('/updateAll/:fecha',async (req,res)=>
{
    var {fecha} = req.params;

    const fechaParam = fecha;
    fecha = fecha.split('-');

    console.log(fechaParam);


    const anio = fecha[0];
    const mes = fecha[1];
    
    const cambio = await scrappingFromSunat(anio,mes);

    console.log(cambio);

    for (let index = 0; index < cambio.length; index++) {
        
        let dateForm = anio+'-'+mes +'-'+cambio[index].dia;
        console.log(cambio[index].compra);
        console.log(cambio[index].venta);
        console.log(dateForm);
        const resultado = await pool.query("select update_tipocambio($1,$2,$3)",[cambio[index].compra,cambio[index].venta,dateForm]);
        console.log(resultado.rows[0].update_tipocambio);
        
        
            if(resultado.rows[0].update_tipocambio==0)
            {
                console.log(anio);
                console.log(mes);
                console.log(cambio[index].dia);
                var dateforHere=anio+'-'+mes+'-'+cambio[index].dia;
                console.log(dateforHere);
                let anotherResult = await pool.query("select insertar_fecha_con_tipo_cambio($1,$2,$3)",[dateforHere,cambio[index].compra,cambio[index].venta]);
                
                console.log(anotherResult.rows[0].insertar_fecha_con_tipo_cambio);
            }
        
    }
    
    return res.status(200).send('Se acabo');
});


app.get('/cambio_dia/:fecha', async (req, res) => {
    var { fecha } = req.params;


    console.log(fecha);

    fecha = fecha.split("-");
    const anio = fecha[0];
    const mes = fecha[1];
    const dia = fecha[2];

    console.log(anio);
    console.log(mes);
    console.log(dia);

    const diaria = await scrappingFromSunatWithDay(anio, mes, dia);
    
    console.log(diaria);

    if (diaria == "ERROR")
        return res.send({ message: 'Dia sin tipo de cambio' })
    else
        return res.send(diaria);
})


app.get('/cambio/:fecha', async (req, res) => {

    var { fecha } = req.params;

    fecha = fecha.split('-');

    const anio = fecha[0];
    const mes = fecha[1];

    console.log(anio);
    console.log(mes);

    const cambio = await scrappingFromSunat(anio, mes);

    console.log(cambio);

    return res.status(200).send(cambio);
});

scrappingFromSunatWithDay = async (anio, mes, dia) => {
    console.log('Dia ' + dia);
    console.log('anio ' + anio);
    console.log('mes ' + mes);
    const tabla = await scrappingFromSunat(anio, mes);

    console.log('La tabla antes del for ');
    console.log(tabla);
    var diaria = null;



    //console.log("Dia transformado a string gaaa  " +dia_string);
    for (let index = 0; index < tabla.length; index++) {
        console.log('Dias dentro del for: ' + tabla[index].dia);
        console.log('Mes dentro del for ' + tabla[index].compra);
        console.log('Anio dentro del for ' + tabla[index].venta);
        console.log('Dia pasado por parametro: ' + dia);
        let dia_string = "0" + tabla[index].dia;
        console.log("Dia transformado agregando el  0: " + dia_string);



        if (dia >= 10) {
            if (tabla[index].dia == dia) {
                diaria =
                    {
                        dia: tabla[index].dia,
                        compra: tabla[index].compra,
                        venta: tabla[index].venta
                    }
                break;
            }
        }
        else {
            if (dia_string == dia) {
                diaria = {
                    dia: tabla[index].dia,
                    compra: tabla[index].compra,
                    venta: tabla[index].venta
                }
                break;
            }
            else {
                diaria = "Dia sin reconocimiento";
            }
        }


    }
    console.log('Dia con compra y venta: ' + diaria.dia + "  " + diaria.compra + "  " + diaria.venta);
    return diaria;
}

scrappingFromSunat = async (anio, mes) => {
    try {
        const navegador = await puppeteer.launch({
            'args' : [
                '--no-sandbox',
                '--disable-setuid-sandbox' 
              ]
        })
        const pagina = await navegador.newPage()
        await pagina.goto('https://e-consulta.sunat.gob.pe/cl-at-ittipcam/tcS01Alias?anho=' + anio + '&&mes=' + mes)
        let tabla = await pagina.evaluate(() => {
            const numeroDia = [
                ...document.querySelectorAll('.h3')
            ].map((nodoNumeroDia) => nodoNumeroDia.innerText);

            var compraventas = [
                ...document.querySelectorAll('.tne10')
            ].map((nodoCompraVenta) => nodoCompraVenta.innerText);



            const soloPares = (compraventas, index) => index % 2 == 0; // dias pares tienen la compra
            const compra = compraventas.filter(soloPares);

            const soloImpares = (compraventas, index) => index % 2 != 0; // dias impares tienen la venta
            const venta = compraventas.filter(soloImpares);


            return numeroDia.map((dia, i) => ({ dia: numeroDia[i], compra: compra[i], venta: venta[i] }))
        })

        //console.log(tabla)

        await navegador.close()
        return tabla;
    } catch (e) {
        console.log(e);
    }

}



app.listen(process.env.PORT || 5000, () => {
    console.log("Servidor arrancado gaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
});
