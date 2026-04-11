import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@ticket-app/ui/components/button";
import { Textarea } from "@ticket-app/ui/components/textarea";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

interface KbFeedbackProps {
  articleId: number;
  locale?: string;
  className?: string;
}

export function KbFeedback({ articleId, locale = "en", className }: KbFeedbackProps) {
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const submitFeedback = useMutation(
    (orpc as any).kbArticles.submitFeedback.mutationOptions({
      onSuccess: () => {
        setHasSubmitted(true);
        toast.success(locale === "ar" ? "شكراً على ملاحظاتك!" : "Thanks for your feedback!");
      },
      onError: () => {
        toast.error(locale === "ar" ? "فشل في إرسال الملاحظات" : "Failed to submit feedback");
      },
    }),
  );

  const handleRate = (rating: "helpful" | "not_helpful") => {
    if (rating === "not_helpful") {
      setShowComment(true);
    } else {
      submitFeedback.mutate({
        articleId,
        rating: "helpful",
      } as any);
    }
  };

  const handleCommentSubmit = () => {
    submitFeedback.mutate({
      articleId,
      rating: "not_helpful",
      comment: comment || undefined,
    } as any);
  };

  if (hasSubmitted) {
    return (
      <div className={className}>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-sm text-muted-foreground">
            {locale === "ar"
              ? "شكراً لملاحظاتك! سنسعى لتحسين هذا المقال."
              : "Thanks for your feedback! We'll use it to improve this article."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="rounded-lg border bg-card p-4">
        <p className="mb-3 text-sm font-medium">
          {locale === "ar" ? "هل كانت هذه المقالة مفيدة؟" : "Was this article helpful?"}
        </p>

        {!showComment ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRate("helpful")}
              className="flex-1"
            >
              <ThumbsUp className="mr-2 h-4 w-4" />
              {locale === "ar" ? "نعم" : "Yes"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRate("not_helpful")}
              className="flex-1"
            >
              <ThumbsDown className="mr-2 h-4 w-4" />
              {locale === "ar" ? "لا" : "No"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                locale === "ar"
                  ? "كيف يمكننا تحسين هذا المقال؟"
                  : "How can we improve this article?"
              }
              rows={3}
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCommentSubmit} disabled={submitFeedback.isPending}>
                {locale === "ar" ? "إرسال" : "Submit"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowComment(false)}>
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
