const { concat } = require("methods");

function calculateQuoteTotal(items) {
   let fixTotal = 0;
   let subscriptionTotal = 0;
   for (let i = 0; i < items.length; i++) {
      if (items[i].category === "priceItem" && items[i].priceItem.isSubscription === false) fixTotal += items[i].priceItem.itemTotal;
      else if (items[i].category === "priceItem" && items[i].priceItem.isSubscription === true) subscriptionTotal += items[i].priceItem.itemTotal;
   }
   if (subscriptionTotal !== 0) return subscriptionTotal;
   else return fixTotal;
};
function isValidPriceItem(pItem) {
   if (
      pItem.itemCode ||
      pItem.productHeading ||
      pItem.longDescription ||
      (Array.isArray(pItem.files) && pItem.files.length > 0) ||
      pItem.unitPrice ||
      pItem.quantity ||
      pItem.itemTotal
   ) return true;
   else return false;
}
function isValidTextItem(tItem) {
   if (
      tItem.textHeading
      || tItem.longDescription
      || (Array.isArray(tItem.files) && tItem.files.length > 0)
   ) return true;
   else return false;
}

function insertArrWithoutDuplication(arr, item) {
   const newArr = arr.filter(it => it.toString() !== item.toString());
   return [...newArr, item];
}

function concatArrWithoutDuplication(arr1, arr2) {
   if (!Array.isArray(arr1) || !Array.isArray(arr2)) return [];
   const resArr = arr1.concat(arr2);
   let uniqueArr = [];
   resArr.forEach((objId) => {
      if (!uniqueArr.includes(objId.toString())) {
         uniqueArr.push(objId.toString());
      }
   });
   return resArr;
}

function replaceLoserByWinner(items, itemType, loserOfMerge, winnerOfMerge) {
   if (!items.length) return [];

   if (itemType === "priceItem" || itemType === "textItem") {
      let resItems = [];
      items.forEach(item => {
         if (item.category === itemType) {
            if (itemType === "priceItem") {
               console.log(" item[itemType] >>>>>>>>>", item[itemType]);
               if (item[itemType].toString() === loserOfMerge) resItems.push({ category: item.category, priceItem: winnerOfMerge });
               else resItems.push(item);
            }
            else if (itemType === "textItem") {
               console.log(" item[itemType] >>>>>>>>>>", item[itemType]);
               if (item[itemType].toString() === loserOfMerge) resItems.push({ category: item.category, textItem: winnerOfMerge });
               else resItems.push(item);
            }
            else resItems.push(item);
         } else resItems.push(item);
      });
      return resItems;
   }
   else if (itemType === "person") {
      let resList = [];
      items.forEach(personId => {
         if (personId.toString() === loserOfMerge) resList.push(winnerOfMerge);
         else resList.push(personId);
      })
      return resList;
   }
   else return [];
}


function isEqualPhones(oldPhones, newPhones) {
   if (oldPhones.length != newPhones.length) return false;
   else {
      for (let i = 0; i < oldPhones.length; i++) {
         if (
            oldPhones[i].category !== newPhones[i].category
            || oldPhones[i].content !== newPhones[i].content
         ) return false;
      }
      return true;
   }
}

function isEqualAddresses(oldAddresses, newAddresses) {
   if (oldAddresses.length != newAddresses.length) return false;
   else {
      for (let i = 0; i < oldAddresses.length; i++) {
         if (
            oldAddresses[i].category !== newAddresses[i].category
            || oldAddresses[i].street !== newAddresses[i].street
            || oldAddresses[i].city !== newAddresses[i].city
            || oldAddresses[i].stateOrRegion !== newAddresses[i].stateOrRegion
            || oldAddresses[i].postCode !== newAddresses[i].postCode
            || oldAddresses[i].country !== newAddresses[i].country
         ) return false;
      }
      return true;
   }
}

function parseBrInStr(str) {
   return str.replace(/(?:\r\n|\r|\n)/g, '<br>');
}
module.exports = {
   calculateQuoteTotal,
   isValidPriceItem,
   isValidTextItem,
   insertArrWithoutDuplication,
   concatArrWithoutDuplication,
   replaceLoserByWinner,
   isEqualPhones,
   isEqualAddresses,
   parseBrInStr
};