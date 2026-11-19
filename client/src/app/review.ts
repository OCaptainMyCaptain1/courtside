// One customer review as saved in MongoDB
export interface Review {
  _id: string;
  name: string;
  rating: number;     // 1 to 5
  comment: string;
  createdAt: string;
}

// What the browser sends when someone submits the form
export interface NewReview {
  name: string;
  rating: number;
  comment: string;
}
