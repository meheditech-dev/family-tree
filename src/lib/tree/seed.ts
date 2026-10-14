import type { Member } from "./types";

export function makeSeed(): Member[] {
  return [
    { id: "m1", name: "আব্দুল করিম", gender: "male", birthYear: 1950, deathYear: 2010, role: "প্রধান মাঝি", spouseId: "m2" },
    { id: "m2", name: "আলেনা বেগম", gender: "female", birthYear: 1955, deathYear: 2020, spouseId: "m1" },
    { id: "m3", name: "রহিম উদ্দিন", gender: "male", birthYear: 1975, parentId: "m1", spouseId: "m4" },
    { id: "m4", name: "ফাতেমা বেগম", gender: "female", birthYear: 1980, spouseId: "m3" },
    { id: "m5", name: "করিমুল ইসলাম", gender: "male", birthYear: 1978, parentId: "m1", spouseId: "m6" },
    { id: "m6", name: "লিনা আক্তার", gender: "female", birthYear: 1983, spouseId: "m5" },
    { id: "m7", name: "আয়েশা সিদ্দিকা", gender: "female", birthYear: 2002, parentId: "m3" },
    { id: "m8", name: "তাসিন রহমান", gender: "male", birthYear: 2005, parentId: "m3" },
    { id: "m9", name: "নাবিলা আক্তার", gender: "female", birthYear: 2009, parentId: "m3" },
    { id: "m10", name: "সাবাব করিম", gender: "male", birthYear: 2004, parentId: "m5" },
    { id: "m11", name: "আরাফ করিম", gender: "male", birthYear: 2007, parentId: "m5" },
    { id: "m12", name: "রায়ান ইসলাম", gender: "male", birthYear: 2011, parentId: "m5" },
  ];
}
