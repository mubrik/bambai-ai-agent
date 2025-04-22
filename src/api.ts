import axios from "axios";

const bambaiApiClient = axios.create({
    baseURL: "https://bambai-staging.risingacademies.com/api",
    timeout: 30000,
});

export default bambaiApiClient;
