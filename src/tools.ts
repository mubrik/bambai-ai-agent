/**
 * Tool definitions for the AI chat agent
 * Tools can either require human confirmation or execute automatically
 */
import { tool } from "ai";
import { z } from "zod";

import { agentContext } from "./server";
import {
  unstable_getSchedulePrompt,
  unstable_scheduleSchema,
} from "agents/schedule";

// api
import bambaiApiClient from "./api";
const AUTH_HEADER = {
  "x-access-token": ""
}

/**
 * Weather information tool that requires human confirmation
 * When invoked, this will present a confirmation dialog to the user
 * The actual implementation is in the executions object below
 */
const getWeatherInformation = tool({
  description: "show the weather in a given city to the user",
  parameters: z.object({ city: z.string() }),
  // Omitting execute function makes this tool require human confirmation
});

/**
 * Local time tool that executes automatically
 * Since it includes an execute function, it will run without user confirmation
 * This is suitable for low-risk operations that don't need oversight
 */
const getLocalTime = tool({
  description: "get the local time for a specified location",
  parameters: z.object({ location: z.string() }),
  execute: async ({ location }) => {
    console.log(`Getting local time for ${location}`);
    return "10am";
  },
});

const scheduleTask = tool({
  description: "A tool to schedule a task to be executed at a later time",
  parameters: unstable_scheduleSchema,
  execute: async ({ when, description }) => {
    // we can now read the agent context from the ALS store
    const agent = agentContext.getStore();
    if (!agent) {
      throw new Error("No agent found");
    }
    function throwError(msg: string): string {
      throw new Error(msg);
    }
    if (when.type === "no-schedule") {
      return "Not a valid schedule input";
    }
    const input =
      when.type === "scheduled"
        ? when.date // scheduled
        : when.type === "delayed"
          ? when.delayInSeconds // delayed
          : when.type === "cron"
            ? when.cron // cron
            : throwError("not a valid schedule input");
    try {
      agent.schedule(input!, "executeTask", description);
    } catch (error) {
      console.error("error scheduling task", error);
      return `Error scheduling task: ${error}`;
    }
    return `Task scheduled for type "${when.type}" : ${input}`;
  },
});

const getUserPersonalData = tool({
  description: "This tool returns the personal information of the user",
  parameters: z.object({}),
  execute: async () => {
    const headers = AUTH_HEADER;
    try {
      const res = await bambaiApiClient.get("me", { headers });
      console.log('res', res.data);
      return JSON.stringify(res.data);
    } catch (error) {
      console.log("err", error);
      return "error"
    }
  },
});

const getSchools = tool({
  description: "This tool returns the schools available for the user",
  parameters: z.object({}),
  execute: async () => {
    const headers = AUTH_HEADER;
    try {
      const res = await bambaiApiClient.get("schools?page=0&perPage=30", { headers });
      console.log('res', res.data);
      return JSON.stringify(res.data);
    } catch (error) {
      console.log("err", error);
      return "error"
    }
  },
});

const getClasses = tool({
  description: "This tool returns the classes available for the user",
  parameters: z.object({}),
  execute: async () => {
    const headers = AUTH_HEADER;
    try {
      const res = await bambaiApiClient.get("classes", { headers });
      console.log('res', res.data);
      return JSON.stringify(res.data);
    } catch (error) {
      console.log("err", error);
      return "error"
    }
  },
});

const getSubjects = tool({
  description: "This tool returns the subjects available for the user",
  parameters: z.object({}),
  execute: async () => {
    const headers = AUTH_HEADER;
    try {
      const res = await bambaiApiClient.get("subjects", { headers });
      console.log('res', res.data);
      return JSON.stringify(res.data);
    } catch (error) {
      console.log("err", error);
      return "error"
    }
  },
});

const GET_STUDENTS_DESCRIPTION = `
This tool returns the students available for the user.
you can filter by schoolId and classIds.
classIds can be a list of ids separated by commas, such as "1,2,3".
schoolIds can be a list of ids separated by commas, such as "1,2,3".
ClassIds can be found using the getClasses tool.
SchoolIds can be found using the getSchools tool.
`

/**
 * This tool returns the students available for the user, you can filter by schoolId and classId, classId can be a list of ids
 * @param schoolIds
 * @param classIds
 */
const getStudents = tool({
  description: GET_STUDENTS_DESCRIPTION,
  parameters: z.object({
    schoolIds: z.string().optional(),
    classIds: z.string().optional(),
  }),
  execute: async ({ schoolIds, classIds }) => {
    const headers = AUTH_HEADER;
    let url = "active-students";

    if (schoolIds) {
      url += `?schoolIds=${schoolIds}`;
    }

    if (classIds) {
      if (url.includes("?")) {
        url += `&classIds=${classIds}`;
      } else {
        url += `?classIds=${classIds}`;
      }
    }

    try {
      const res = await bambaiApiClient.get(url, { headers });
      console.log('res', res.data);
      return JSON.stringify(res.data);
    } catch (error) {
      console.log("err", error);
      return "error"
    }
  },
});

const SEARCH_STUDENT_DESCRIPTION = `
This tool returns a list of students that match the search term.
you can search by name. it is compulsory to pass the name.
you can pass the schoolIds to filter the students by school.
`

/**
 * This tool searches for a student by their name
 * @param name
 */
const searchStudent = tool({
  description: SEARCH_STUDENT_DESCRIPTION,
  parameters: z.object({
    name: z.string(),
    schoolIds: z.string().optional(),
  }),
  execute: async ({ name, schoolIds }) => {

    const headers = AUTH_HEADER;
    // make name url safe
    let url = `/students/typeahead?searchText=${encodeURIComponent(name)}`;
    if (schoolIds) {
      url += `?schoolIds=${schoolIds}`;
    }

    try {
      const res = await bambaiApiClient.get(url, { headers });
      console.log('res', res.data);
      return JSON.stringify(res.data);
    } catch (error) {
      console.log("err", error);
      return "error"
    }
  },
});

const GET_STUDENT_DESCRIPTION = `
This tool returns the full information of a student.
you need to pass the studentId to get the information.
you can get studentId (_id) using the getStudents tool.
`

/**
 * This tool returns information about a specific student
 */
const getStudent = tool({
  description: GET_STUDENT_DESCRIPTION,
  parameters: z.object({
    studentId: z.string()
  }),
  execute: async ({ studentId }) => {
    const headers = AUTH_HEADER;
    let url = `student/${studentId}`;
    try {
      const res = await bambaiApiClient.get(url, { headers });
      console.log('res', res.data);
      return JSON.stringify(res.data);
    } catch (error) {
      console.log("err", error);
      return "error"
    }
  },
});

/**
 * Export all available tools
 * These will be provided to the AI model to describe available capabilities
 */
export const tools = {
  getUserPersonalData,
  getWeatherInformation,
  getLocalTime,
  scheduleTask,
  getClasses,
  getSubjects,
  getSchools,
  getStudents,
  searchStudent,
  getStudent
};

/**
 * Implementation of confirmation-required tools
 * This object contains the actual logic for tools that need human approval
 * Each function here corresponds to a tool above that doesn't have an execute function
 */
export const executions = {
  getWeatherInformation: async ({ city }: { city: string }) => {
    console.log(`Getting weather information for ${city}`);
    return `The weather in ${city} is sunny`;
  },
};
