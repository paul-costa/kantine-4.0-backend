

const fs = require('fs');
const pdf = require('pdf-parse');
const request = require('request');

function getTextData() {

    const today = new Date().getTime();
    const firstOfYear = new Date(new Date().getFullYear(),0,1,1).getTime();
    const currentKW = Math.floor((today - firstOfYear)/1000/60/60/24/7+1);

    let pdfTitle = 'wochenplan_KW' + currentKW + '.pdf';

    if(currentKW<10) {
        pdfTitle = pdfTitle.slice(0, -1) + '0' + currentKW + '.pdf';
    }

    return new Promise(resolve => {
        request('https://www.m-eventcatering.at/m-lunchsolutions/wochenplan/wochenplan.pdf')
        .pipe(fs.createWriteStream(pdfTitle))
        .on('finish', () => {
            pdf(fs.readFileSync(pdfTitle))
                .then((data) => {
                    resolve(data.text); 
                }, err => {
                    console.log(err);
                }
            );
        });
    });
}
    
async function asyncCallGetTextData() {
    return await getTextData();
}


exports.getWeekPlanData = (req, res, next) => {
    asyncCallGetTextData().then(result => {
        
        const formattedResult = formatResponse(result);
        
        res.status(200).json({
            message: 'Pdf data parsed',
            pdfdata: formattedResult,
        })
    });
}


function formatResponse(resultText) {
    const resultObj = {
        clearSoup: null,
        cremeSoup: null,
        salad: null,
        weekPizza: null,
        dayPizza: null,
        menu1: null,
        menu2: null,
        wok: null,
        grill: null,
        dessert: null,
    };

    let resultArr = resultText.split('\n');
    resultArr.forEach((el, i) => { resultArr[i]=el.trim(); });
    const spliceNumbers = [5,1,6,3,2,2,2,0];    // how many elements have to be splice between each dish-group in array


    const foodArr = findFoodArr(resultArr, spliceNumbers, []);

    resultObj.clearSoup = cleanAndSortArr('clearSoup', foodArr.foodArrays[0], 1.8);
    resultObj.cremeSoup = cleanAndSortArr('cremeSoup', foodArr.foodArrays[1], 1.8);
    resultObj.dayPizza = cleanAndSortArr('dayPizza', foodArr.foodArrays[2], 7.9);
    resultObj.menu1 = cleanAndSortArr('menu1', foodArr.foodArrays[3], 6.5);
    resultObj.menu2 = cleanAndSortArr('menu2', foodArr.foodArrays[4], 6.5);
    resultObj.wok = cleanAndSortArr('wok', foodArr.foodArrays[5], null);
    resultObj.grill = cleanAndSortArr('grill', foodArr.foodArrays[6], null);
    resultObj.dessert = cleanAndSortArr('dessert', foodArr.foodArrays[7], 1.8);

    resultArr = foodArr.newResult;
    
    // WEEK PIZZA
    const weekPizza = findWeekPizza(resultArr);
    resultObj.weekPizza = weekPizza.weekpizza;
    resultArr= weekPizza.newResult;

    // SALAD
    resultObj.salad = findSalad(resultArr);



    return resultObj;





    function findFoodArr(resultArr, spliceNumbers, foodArrays) {
        const arrLength = foodArrays.length;
        const initialArrSplice = spliceNumbers[arrLength];


        // splice off headers (type of dish etc.)
        resultArr.splice(0,initialArrSplice);

        // find positions of start (first dish monday) and 'kcal' cell (last cell friday)
        const foodArrStartIndex = 0;
        const foodArrEndIndex = resultArr.indexOf(resultArr.filter(el => el.includes('kcal'))[4])+1;
    
        // create foodArr
        const foodArr = [...resultArr].slice(foodArrStartIndex, foodArrEndIndex);

        // splice this foodArr of resultArr
        resultArr.splice(0,foodArrEndIndex);

        foodArrays.push(foodArr);

        if(arrLength<7) {
            return findFoodArr(resultArr, spliceNumbers, foodArrays);
        }
        else {
            return {
                foodArrays: foodArrays,
                newResult: resultArr,
            };
        }
    }

    function findWeekPizza(resultArr) {
        resultArr.splice(0,3);  // remove headers

        const weekpizzaStartIndex = 0;
        const weekpizzaEndIndex = resultArr.indexOf(resultArr.filter(el => el.includes('kcal'))[0])+1;

        const weekpizzaArr = [...resultArr];
        resultArr.splice(weekpizzaStartIndex, weekpizzaEndIndex);

        return {
            weekpizza: makeWeekPizzaObj(weekpizzaArr.slice(weekpizzaStartIndex, weekpizzaEndIndex)),
            newResult: resultArr,
        }



        function makeWeekPizzaObj(weekpizzaArr) {
            weekpizzaArr = weekpizzaArr.join('|').split('|');

            const name = weekpizzaArr[0].trim();
            const kcal = +weekpizzaArr[weekpizzaArr.length-2].replace(/\D/g,'');
            const allergens = weekpizzaArr[weekpizzaArr.length-1].trim();
            const ingredients = [];


            for(ingEl of weekpizzaArr.slice(1, weekpizzaArr.length-2)) {
                ingredients.push(ingEl.trim());
            }


            return {
                id: 'weekPizza-99',
                dish: {
                    name:  name,
                    ingredients: ingredients,
                    kcal: kcal,
                    allergens: allergens,
                },
                price: 6.9,
            }
        }
    }

    function findSalad(resultArr) {
        return {
            id: 'salad-99',
            dish: {
                name: resultArr[resultArr.length-3].split('|')[0].trim(),
                ingredients: [(resultArr[resultArr.length-3].split('|')[1] + ", " + resultArr[resultArr.length-2].replace('Das gesunde Plus - ', '')).trim()],
            },
            price: [1.8, 4.5, 6.5],
        }
    }


    





    function cleanAndSortArr(foodName, foodArr, price) {        
        const kcalElements = foodArr.filter(el => el.includes('kcal'));
        const kcalElementsIndex = [0];

        let kcalElIndexNr = 0;

        for(kcalEl of kcalElements) {
            kcalElementsIndex.push(foodArr.indexOf(kcalEl, kcalElIndexNr)+1);
            kcalElIndexNr = foodArr.indexOf(kcalEl, kcalElIndexNr)+1;
        }

        const foodByDay = [];
        const foodByDayObj = [];

        for(let i=0; i<5; i++) {
            foodByDay[i]=foodArr.slice(kcalElementsIndex[i],kcalElementsIndex[i+1]);
        }


        let day = 0;

        for(foodByDayEl of foodByDay) {
            const name = foodByDayEl[0].trim();
            let ingredients = '';
            let kcal = '';
            let allergens = '';

            for(let i=1; i<foodByDayEl.length-1; i++) {
                ingredients += foodByDayEl[i].trim();
            }

            ingredients = ingredients.split('|');

            // remove access whitespace
            ingredients.forEach((el, i) => {
                ingredients[i] = el.trim();
            });

            const additionalData = foodByDayEl[foodByDayEl.length-1].split("|");

            kcal = +additionalData[0].replace(/\D/g,'');

            if(additionalData[1]) {
                allergens = additionalData[1].trim();
            }
            

            // if price is variable it has to be extracted
            if(additionalData[2]) {
                price = +additionalData[2].replace(/\D/g,'')/100;
            }


            foodByDayObj.push({
                id: foodName+'-'+day,
                dish: {
                    name: name,
                    ingredients: ingredients,
                    kcal: kcal,
                    allergens: allergens,
                },
                price: price,
            });

            day++;
        }

        return foodByDayObj;
    }
}