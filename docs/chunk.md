# chunk

Chunk every n items into an array, and output that array in the output sequence.
Chunks are yielded after `timeout` milliseconds even if not full, so that values
can be processed in a timely manner. Never yields empty chunks.

Backpressure is provided by the iterator when a chunk is yielded. Stopping the
iterator will stop chunking and the input iterable.

-   `n` **[Number][9]** size of arrays
-   `timeout` **[Number][9]** number of milliseconds before yielding chunk if not full
-   `iterable` **(AsyncIterable | Iterable)** the iterable to chunk

Returns **AsyncGenerator** that provides each chunk in order
