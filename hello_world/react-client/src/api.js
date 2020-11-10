
const LISK_API = 'http://localhost:4000';
const CUSTOM_API = 'http://localhost:8080';

export const sendTransactions = async (tx) => {
    return fetch(LISK_API + "/api/transactions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(tx),
    });
};

export const fetchAccountInfo = async (address) => {
    return fetch(LISK_API +`/api/accounts/${address}`)
        .then((res) => res.json())
        .then((res) => res.data);
};

export const fetchHelloCounter = async () => {
    return fetch(CUSTOM_API + "/api/hello_counter")
        .then((res) => res.json())
        .then((res) => {
            console.log("======= res ---------");
            console.log(res);
            return res.data
        })
};

export const fetchLatestHello = async () => {
    return fetch(CUSTOM_API + '/api/latest_hello')
        .then((res) => res.json())
        .then((res) => res.data);
};
