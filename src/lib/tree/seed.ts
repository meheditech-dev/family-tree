import type { Member } from "./types";

/**
 * Demo data — designed to stress-test the horizontal layout:
 *  Generation 1 : 1 couple (root)
 *  Generation 2 : 3 children, each with a spouse
 *  Generation 3 : 8 children under m3/m4 alone → verifies no sibling overlap
 *  Generation 4 : 2 grandchildren under m14/m15
 */
export function makeSeed(): Member[] {
  return [
    // Gen 1 – root couple
    { id: "m1",  name: "আব্দুল করিম",    gender: "male",   birthYear: 1945, deathYear: 2015, role: "প্রধান মাঝি", spouseId: "m2" },
    { id: "m2",  name: "আলেনা বেগম",     gender: "female", birthYear: 1950, deathYear: 2018, spouseId: "m1" },

    // Gen 2 – three children
    { id: "m3",  name: "রহিম উদ্দিন",    gender: "male",   birthYear: 1972, parentId: "m1", spouseId: "m4" },
    { id: "m4",  name: "ফাতেমা বেগম",    gender: "female", birthYear: 1975, spouseId: "m3" },

    { id: "m5",  name: "করিমুল ইসলাম",  gender: "male",   birthYear: 1975, parentId: "m1", spouseId: "m6" },
    { id: "m6",  name: "লিনা আক্তার",    gender: "female", birthYear: 1978, spouseId: "m5" },

    { id: "m13", name: "সুমাইয়া বেগম",  gender: "female", birthYear: 1978, parentId: "m1", spouseId: "m14" },
    { id: "m14", name: "জাহিদ হাসান",    gender: "male",   birthYear: 1976, spouseId: "m13" },

    // Gen 3 – 8 children under m3/m4 (the stress-test generation)
    { id: "m7",  name: "আয়েশা সিদ্দিকা",  gender: "female", birthYear: 1995, parentId: "m3" },
    { id: "m8",  name: "তাসিন রহমান",     gender: "male",   birthYear: 1997, parentId: "m3" },
    { id: "m9",  name: "নাবিলা আক্তার",   gender: "female", birthYear: 1999, parentId: "m3" },
    { id: "m15", name: "সাদিয়া ইসলাম",   gender: "female", birthYear: 2000, parentId: "m3" },
    { id: "m16", name: "রাফি করিম",       gender: "male",   birthYear: 2002, parentId: "m3" },
    { id: "m17", name: "মাহিয়া খান",     gender: "female", birthYear: 2004, parentId: "m3" },
    { id: "m18", name: "তানভীর আহমেদ",   gender: "male",   birthYear: 2006, parentId: "m3" },
    { id: "m19", name: "লামিয়া বেগম",    gender: "female", birthYear: 2008, parentId: "m3" },

    // Gen 3 – children under m5/m6
    { id: "m10", name: "সাবাব করিম",      gender: "male",   birthYear: 1998, parentId: "m5" },
    { id: "m11", name: "আরাফ করিম",       gender: "male",   birthYear: 2000, parentId: "m5" },
    { id: "m12", name: "রায়ান ইসলাম",    gender: "male",   birthYear: 2003, parentId: "m5" },

    // Gen 3 – children under m13/m14
    { id: "m20", name: "ইরা হাসান",       gender: "female", birthYear: 2001, parentId: "m13" },
    { id: "m21", name: "নাফিস হাসান",     gender: "male",   birthYear: 2004, parentId: "m13" },

    // Gen 4 – grandchildren under m8
    { id: "m22", name: "আলিফ রহমান",     gender: "male",   birthYear: 2020, parentId: "m8" },
    { id: "m23", name: "মীম রহমান",      gender: "female", birthYear: 2022, parentId: "m8" },
  ];
}
