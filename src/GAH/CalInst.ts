import axios from 'axios';

// CalInst - Get counselor's calendar
export default async (calinst_uid: string) => {
  console.log('Base URL', process.env.BASE_URL);
  return await axios.get(`${process.env.BASE_URL}/meeting/calinst/user/${calinst_uid}`);
};
