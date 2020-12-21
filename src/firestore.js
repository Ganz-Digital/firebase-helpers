/**
 * Recursively turn Firebase timestamps into JS Date objects.
 * @param {object} firebaseDocumentData The document you want to convert
 */
export function convertFirestoreTimestamps(firebaseDocumentData) {
  const data = { ...firebaseDocumentData };
  for (const key in firebaseDocumentData) {
    if (firebaseDocumentData.hasOwnProperty(key)) {
      const value = firebaseDocumentData[key];
      if (!value) {
        continue;
      }
      if (typeof value === 'object') {
        if (Array.isArray(value)) {
          continue;
        }
        if (value.toDate) {
          data[key] = value.toDate();
          continue;
        }
        data[key] = convertFirestoreTimestamps(value);
      }
    }
  }
  return data;
}

/**
 *
 * @param {Firestore Query} query The query you want to paginate
 * @param {Firestore DocumentReference} lastDocument The last document you fetched with this query
 * @param {number} pageSize How many results you want to fetch per page, default: 10
 */
export async function getPaginatedData(query, lastDocument, pageSize = 10) {
  let paginatedQuery = query.limit(pageSize);
  if (lastDocument) {
    paginatedQuery = paginatedQuery.startAfter(lastDocument);
  }
  try {
    const snapshot = await paginatedQuery.get();
    if (snapshot.empty) {
      return {
        data: [],
        lastDoc: null,
      };
    }
    const data = [];
    snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
    return {
      data: data,
      lastDoc: snapshot.docs[snapshot.docs.length - 1],
    };
  } catch (e) {
    logError(e);
    return {
      data: [],
      lastDoc: null,
    };
  }
}

/**
 * Get the data array of a query snapshot. Including the document ID.
 * @param {Firestore QuerySnapshot} querySnapshot The snapshot you got from a query
 * @param {boolean} transformDates Do you want to turn Firebase timestamps into JS dates? Default: true.
 */
export function convertQuerySnapshot(querySnapshot, transformDates = true) {
  return querySnapshot.docs.map(doc => {
    let data = doc.data();
    if (transformDates) {
      data = convertFirestoreTimestamps(data);
    }
    return { id: doc.id, ...data };
  });
}

/**
 * Get documents with an 'in' query where the array contains more than 10 elements.
 * @param {Firestore Query | FirestoreCollectionReference} query A Firestore query or collection
 * @param {string | any} fieldToQuery The field you want to query
 * @param {array} documentIDs The array of values that the query should match
 * @param {number} batchSize Default: 10
 */
  export function getDocsByArrayMembership(query, fieldToQuery, array, batchSize = 10) {
      let batchStart = 0;
      let batchEnd = batchStart + batchSize;
      let data = []
      while (batchEnd < array.length) {
        const batch = await query
          .where(fieldToQuery, 'in', array.slice(batchStart, batchEnd))
          .get()
          .then(convertQuerySnapshot)
        data = [...data, ...batch]
        batchStart += batchSize;
        batchEnd += batchSize;
      }
      return data;
  }
