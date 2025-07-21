import { AxiosInstance } from "axios";
import { ClientUser } from "discord.js-selfbot-v13";


export async function fetchUser(axiosInstance:AxiosInstance): Promise<ClientUser | null> {
  try {
    const response = await axiosInstance.get('/users/@me');
    return response?.data;
  } catch (error) {
  //  console.error('Error fetching quests:', error);
    return null;
  }
}