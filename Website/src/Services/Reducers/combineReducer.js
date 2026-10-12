import { combineReducers } from "redux";
import reducers from "./reducers";

const rootReducer = combineReducers({
    igc_data : reducers
})


export default rootReducer