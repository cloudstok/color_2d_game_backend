import axios from 'axios';
import { FinalUserData, RawUserData } from '../../interfaces';

function getImageValue(id: string): number {
  let sum = 0;
  for (const char of id) {
    sum += char.charCodeAt(0);
  }
  return (sum % 7) + 1;
}

export const getUserDataFromSource = async (
  token: string,
  game_id: string
): Promise<FinalUserData | false | undefined> => {
  try {
    const response = await axios.get(`${process.env.service_base_url}/service/user/detail`, {
      headers: {
        token: token,
      },
    });

    const userData: RawUserData | undefined = response?.data?.user;

    if (userData) {
      const { operatorId } = userData;
      const id = `${operatorId}:${userData.user_id}`;
      const image = getImageValue(id);

      const finalData: FinalUserData = {
        ...userData,
        id,
        game_id,
        token,
        image,
      };

      return finalData;
    }

    return;
  } catch (err: any) {
    console.error(err);
    return false;
  }
};
