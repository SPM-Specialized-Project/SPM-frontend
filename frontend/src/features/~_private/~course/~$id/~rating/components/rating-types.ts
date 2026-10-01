export interface RatingItem {
  id: string;
  title: string;
  rating: number;
}

export type StudentRatingRecord = {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  submittedAt: string;
  comment: string;
  items: RatingItem[];
};

export type RatingUser = {
  isCoordinator?: boolean;
  isStudent?: boolean;
  isLecturer?: boolean;
  statisticalPermission?: boolean;
};

export type RatingUserStore = {
  state?: {
    user?: RatingUser;
  };
};
