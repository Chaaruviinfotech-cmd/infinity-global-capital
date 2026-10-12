import { combineReducers } from "redux";
import actionReducers from "./actionReducers";


const rootReducer = combineReducers({
    action: actionReducers
})

export default rootReducer