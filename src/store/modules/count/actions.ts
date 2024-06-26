import { ActionTree } from "vuex"	
import RootState from "@/store/RootState"	
import CountState from "./CountState"
import * as types from "./mutation-types"
import { CountService } from "@/services/CountService"
import logger from "@/logger"
import { hasError, showToast } from "@/utils"
import emitter from "@/event-bus"
import { translate } from "@/i18n"
import router from "@/router"

const actions: ActionTree<CountState, RootState> = {
  async fetchCycleCounts({ commit, dispatch, state }, payload) {
    emitter.emit("presentLoader", { message: "Fetching cycle counts" })
    let counts: Array<any> = [], total = 0;

    const params = {
      ...payload
    }

    if(state.query.facilityId) {
      params["facilityId"] = state.query.facilityId
    }

    if(state.query.noFacility) {
      if(params["facilityId"]) {
        params["facilityId"] = params["facilityId"].concat(", ''")
        params["facilityId_op"] = "in"
      } else {
        params["facilityId_op"] = "empty"
      }
    }

    try {
      const resp = await CountService.fetchCycleCounts(params);

      if(!hasError(resp) && resp.data.length > 0) {
        counts = resp.data
        total = resp.data.length

        dispatch("fetchCycleCountStats", counts.map((count) => count.inventoryCountImportId))
      } else {
        throw "Failed to fetch the counts"
      }
    } catch(err) {
      logger.error(err)
    }
    commit(types.COUNT_LIST_UPDATED, { counts, total })
    emitter.emit("dismissLoader")
  },

  async fetchCycleCountStats({ commit }, inventoryCountImportIds) {
    try {
      const resp = await CountService.fetchCycleCountStats({ inventoryCountImportIds });

      if(!hasError(resp) && resp.data?.importStats?.length > 0) {
        commit(types.COUNT_STATS_UPDATED, resp.data.importStats)
      } else {
        throw "Failed to fetch the count stats"
      }
    } catch(err) {
      logger.error(err)
    }
  },

  async clearCycleCountList({ commit }) {
    commit(types.COUNT_LIST_UPDATED, { counts: [], total: 0 })
  },

  async createCycleCount({ dispatch }, payload) {
    try {
      const resp = await CountService.createCycleCount(payload);

      if(!hasError(resp) && resp.data.inventoryCountImportId) {
        showToast(translate("Cycle Count created successfully"))
        await dispatch("fetchCycleCounts", {
          statusId: "INV_COUNT_CREATED"
        })
      } else {
        throw "Failed to create cycle count"
      }

    } catch(err) {
      logger.error(err)
      showToast(translate("Failed to create cycle count"))
    }
  },

  async updateQuery({ commit, dispatch }, payload) {
    commit(types.COUNT_QUERY_UPDATED, payload)
    let statusId = "INV_COUNT_CREATED"
    if(router.currentRoute.value.name === "PendingReview") {
      statusId = "INV_COUNT_REVIEW"
    } else if(router.currentRoute.value.name === "Assigned") {
      statusId = "INV_COUNT_ASSIGNED"
    } else if(router.currentRoute.value.name === "Closed") {
      statusId = "INV_COUNT_COMPLETED"
    }
    dispatch("fetchCycleCounts", { statusId })
  }
}	

export default actions;	
