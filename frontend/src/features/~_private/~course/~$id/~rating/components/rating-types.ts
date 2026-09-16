export interface RatingItem {
  id: string;
  title: string;
  rating: number;
}

export type RatingUser = {
  isCoordinator?: boolean;
  isStudent?: boolean;
  isTutor?: boolean;
  statisticalPermission?: boolean;
};

export type RatingUserStore = {
  state?: {
    user?: RatingUser;
  };
};
