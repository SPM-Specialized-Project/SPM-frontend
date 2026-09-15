import { type PastRegistration, pastRegistrationDriver } from "@/components/data/~mock-register";
import { tutorRegistrationDriver } from "@/components/data/~mock-tutor-register";

export function hardMatch(student: PastRegistration, tutor: PastRegistration){
    // 1. môn
    const subjectMatch = tutor.subjects.some(t =>
        student.subjects.some(s => s.id === t.id)
    );
    if (!subjectMatch) return false;

    // 2. ngôn ngữ
    const languageMatch = tutor.languages.some(t =>
        student.languages.some(s => s.id === t.id)
    );
    if (!languageMatch) return false;

    // 3. onl hay off
    const sessionMatch = tutor.sessionTypes.some(t =>
        student.sessionTypes.some(s => s.id === t.id)
    );
    if (!sessionMatch) return false;

    // 4. địa chỉ
    const studentOffline = student.sessionTypes.some(s => s.id === "offline");

    if (studentOffline) {
        const locationMatch = tutor.locations.some(t =>
        student.locations.some(s => s.id === t.id)
        );
        if (!locationMatch) return false;
    }
    return true;
}

export function getMatchedTutors(student: PastRegistration) {
    return tutorRegistrationDriver.list().filter(tutor => hardMatch(student, tutor));
}

export function matchAllStudents() {
    return pastRegistrationDriver.list().map(student => ({
        student: student.Name,
        matchedTutors: getMatchedTutors(student),
    }));
}

