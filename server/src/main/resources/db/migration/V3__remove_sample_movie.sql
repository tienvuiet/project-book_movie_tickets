DELETE mg FROM movie_genres mg JOIN movies m ON m.id = mg.movie_id
WHERE m.title = 'Cinema Demo' AND NOT EXISTS (SELECT 1 FROM showtimes s WHERE s.movie_id = m.id);
DELETE m FROM movies m
WHERE m.title = 'Cinema Demo' AND NOT EXISTS (SELECT 1 FROM showtimes s WHERE s.movie_id = m.id);
