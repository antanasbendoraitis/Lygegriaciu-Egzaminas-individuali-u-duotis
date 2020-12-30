
//3-4 paleidžia ir grąžina aktorių sistemą
const { start, dispatch, stop, spawnStateless, spawn, message, ActorSystem } = require('nact');
const system = start();
const prompt = require('prompt-sync')();//Vartotojui per konsolę užklausimui ir atsako gavimui.

const duomFailas = './IFF-81_BendoraitisA_L1_dat_1';

//Nuskatomi duomenys iš JSON failo
const duomenys = require(duomFailas + '.json').students;

//11-16 eilutės aktorių duomenys.length/4 > x ir x > 1 vartotojo pasirenka leistiną aktorių skaičių.
const aktoriai = prompt(`| Įveskite norimą aktorių darbininkų skaičių 2 <= x <= ${Math.round(duomenys.length/4)} | ==> Aktorių skaičius: `);

if (isNaN(parseInt(aktoriai)) || aktoriai < 2 || aktoriai > duomenys.length/4){
    console.log('Įvestas netinkamas darbininkų skaičius!!!');
    process.exit();
}

const SPAUSDINIMAS = -3, REZULTATAS = -2, KAUPIKLIS = -1;
const spausdinti = require('fs');
const rez = new Array(duomenys.length);

//Spausdinami pradiniai duomenys
spausdintiPradiniusDuomenis(duomenys);

//Sukuriamas skirstytuvas
const skirstytuvas = spawnStateless (
    system,
    async (msg, ctx) => {
        switch (msg.signalas) {
            case SPAUSDINIMAS: //Rezultatų gautų iš kaupiklio persiuntimas Spausdintojui
                dispatch(spausdintojas, { duom: msg.duom});
                break;
            case REZULTATAS: //Signalas Kaupikliui grąžinti duomenis
                dispatch(rezultatųKaupiklis, { signalas: msg.signalas});
                break;
            case KAUPIKLIS://Rezultato priėmimas ir iš darbininko ir persiuntimas į Kaupiklį
                dispatch(rezultatųKaupiklis, { duom: msg.duom}); 
                break;
            default: //Persiuntimas vienam iš darbininkų
                dispatch(darbininkai[msg.signalas%aktoriai], { duom: msg.duom});
                break;
        }
    },
    'skirstytuvas'
);

//Skaičių masyvas nuo 0 iki x (darbininkų vardams)
const skaičiai = Array.apply(null, {length: aktoriai}).map(Number.call, Number);
const darbininkai = new Array(aktoriai); //Darbininkų masyvas

//Sukuriami darbininkai
skaičiai.forEach(async(elementas) => {
    darbininkai[elementas] = spawnStateless (
        system,
        async (msg, ctx) => {
            if(standartas(msg.duom)){//Duomenų filtravimas
                msg.duom.balsės = skaičiuotiBalses(msg.duom.name);
                dispatch(skirstytuvas, { duom: msg.duom, signalas: KAUPIKLIS });
            }
        },
        `${elementas}`
    );
});

//Sukuriamas rezultatų kaupiklis
const rezultatųKaupiklis = spawnStateless (
    system,
    async (msg, ctx) => {
        if(msg.signalas == REZULTATAS){
            dispatch(skirstytuvas, { duom: rez, signalas: SPAUSDINIMAS });
        }else{
            const ind = rez.findIndex(element => element === undefined);//Laisvos vietos masyve radimas
            rez[ind] = msg.duom;
            rez.sort((a,b) => b.age - a.age);  //Rikiavimas pagal amžių
        }
    },
    'rezultatuKaupiklis'
);

//Sukuriamas spausdintojas
const spausdintojas = spawnStateless (
    system,
    async (msg, ctx) => {
        spausdintiRezultatus(msg.duom);
    },
    'spausdintojas'
);

//Po vieną susiunčiami duomenys į skirstytuvą
duomenys.forEach((elementas, vieta) => {
    dispatch(skirstytuvas, { duom: elementas, signalas: vieta });
});

//Pranešama skirstytuvui, kad daugiau duomenų nebus
dispatch(skirstytuvas, { signalas: REZULTATAS });

/**
 * Tikrinamas amžiaus ir aukščio atitikimas
 * @param {*Fiziniai duomenys} duom 
 */
function standartas(duom) {
    if (duom.age >= 30 && duom.age <= 80 && duom.height >= 170)
        return true;
    return false;
}

/**
 * Žodyje esančių balsių skaičiavimas.
 * @param {*Asmens vardas} vardas 
 */
function skaičiuotiBalses(vardas){
    const balsės = vardas.match(/[aeiouy]/gi);
    return balsės === null ? 0 : balsės.length;
}

/**
 * Spausdina pradinius duomenis į failą.
 * @param {Asmenų fiziniai duomenys} duom 
 */
function spausdintiPradiniusDuomenis(duom){
    const žvaigždė = '*'.repeat(30)+'\n';
    var rašyti = spausdinti.createWriteStream((duomFailas + '_rez.txt'), {
        flags: 'w'
      })
      
      rašyti.write(`${žvaigždė}***** Pradiniai duomenys *****\n${žvaigždė}`);
      rašyti.write(`| ${'Vardas'.padEnd(7)} | ${'Amžius'.padEnd(5)} | ${'Aukštis'.padEnd(6)} |\n${žvaigždė}`);

      duom.forEach(dm => {
          rašyti.write(`|${dm.name.padEnd(8)} | ${(dm.age + '').padStart(6)} | ${(dm.height + '').padStart(7)} |\n`);
      });

      rašyti.write(žvaigždė);
      rašyti.end();
}

/**
 * Spausdina atrinktus duomenis į failą.
 * @param {Asmenų fiziniai duomenys} duom 
 */
function spausdintiRezultatus(duom){
    const žvaigždė = '*'.repeat(39)+'\n';
    var rašyti = spausdinti.createWriteStream((duomFailas + '_rez.txt'), {
        flags: 'a'
      })
      
      rašyti.write(`${žvaigždė}********** Rezultatų duomenys *********\n${žvaigždė}`);
      rašyti.write(`| ${'Vardas'.padEnd(7)} | ${'Amžius'.padEnd(5)} | ${'Aukštis'.padEnd(6)} | ${('Balsės').padEnd(6)} |\n${žvaigždė}`);

      duom.forEach(dm => {
          rašyti.write(`|${dm.name.padEnd(8)} | ${(dm.age + '').padStart(6)} | ${(dm.height + '').padStart(7)} | ${(dm.balsės + '').padStart(6)} |\n`);
      });

      rašyti.write(žvaigždė);
      rašyti.end();

      stop(system); //sustabdoma aktorių sistema
}